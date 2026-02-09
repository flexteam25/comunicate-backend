import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../../logger/logger.service';
import { RedisService } from '../../redis/redis.service';
import { RedisChannel } from '../../socket/socket-channels';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../modules/point/domain/entities/point-transaction.entity';
import { BetHistory } from '../../../modules/minigame/domain/entities/bet-history.entity';
import { formatPoints } from '../../utils/point.util';

/** Payload for creating a new bet_history row (bet callback). */
export interface BetHistoryCreatePayload {
  roundNumber?: string | null;
  betAmount: number;
  roundResult?: string;
  coinType?: string;
}

/** Payload for updating bet_history (win/lose). Processor finds row by roundNumber or pending. */
export interface BetHistoryUpdatePayload {
  roundNumber?: string;
  roundResult?: string;
  payout?: number;
  payoutAmount?: number;
  maxPayoutDeduct?: number;
}

export interface GamePointLogJobData {
  userId: string;
  txRef: string;
  type: 'bet' | 'cancel_bet' | 'win' | 'lose' | 'draw' | 'refund';
  pointTransactionType: PointTransactionType;
  amount: number;
  balanceAfter: number;
  category: string;
  referenceType?: string;
  referenceId?: string; // Set by processor from bet_history.id when present
  description?: string;
  descriptionKo?: string;
  metadata?: Record<string, any>;
  pointsDelta: number;
  previousPoints: number;
  newPoints: number;
  gameType?: string;
  createdAt: string; // ISO timestamp generated in sync path
  /** Create bet_history row (bet); processor sets referenceId = bet_history.id */
  betHistoryCreate?: BetHistoryCreatePayload;
  /** Update bet_history (win/lose); processor finds row then sets referenceId = bet_history.id */
  betHistoryUpdate?: BetHistoryUpdatePayload;
  /** True for deduct job: only persist point_transaction, no POINT_UPDATED publish */
  skipPublish?: boolean;
  /** True for lose: only update bet_histories (pending -> lost), no point_transaction, no publish */
  skipPointTransaction?: boolean;
}

@Processor('game-point-log')
@Injectable()
export class GamePointLogProcessor extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepo: Repository<PointTransaction>,
    @InjectRepository(BetHistory)
    private readonly betHistoryRepo: Repository<BetHistory>,
  ) {
    super();
  }

  /** Find bet_history by round_number, or pending row (user + gameType). */
  private async findBetHistoryForUpdate(
    userId: string,
    gameType: string,
    roundNumber?: string,
  ): Promise<BetHistory | null> {
    const gt = gameType || 'game';
    if (roundNumber) {
      const byRound = await this.betHistoryRepo.findOne({
        where: { userId, roundNumber },
      });
      if (byRound) return byRound;
    }
    const pending = await this.betHistoryRepo.findOne({
      where: { userId, gameType: gt, roundResult: 'pending' },
      order: { createdAt: 'DESC' },
    });
    return pending ?? null;
  }

  async process(job: Job<GamePointLogJobData>): Promise<any> {
    const data = job.data;

    try {
      const createdAt = new Date(data.createdAt);
      const gameTypeVal = data.gameType || 'game';
      let referenceId: string | undefined = data.referenceId;

      // 1) Create or update bet_history; use its id as referenceId for point_transaction
      if (data.betHistoryCreate) {
        const payload = data.betHistoryCreate;
        const row = this.betHistoryRepo.create({
          userId: data.userId,
          gameType: gameTypeVal,
          roundNumber: payload.roundNumber ?? null,
          betAmount: payload.betAmount,
          coinType: payload.coinType || 'point',
          roundResult: payload.roundResult || 'pending',
          payout: null,
          payoutAmount: 0,
          maxPayoutDeduct: 0,
          txRef: data.txRef,
        });
        const saved = await this.betHistoryRepo.save(row);
        referenceId = saved.id;
      } else if (data.betHistoryUpdate) {
        const payload = data.betHistoryUpdate;
        const row = await this.findBetHistoryForUpdate(
          data.userId,
          gameTypeVal,
          payload.roundNumber,
        );
        if (row) {
          row.roundNumber = payload.roundNumber ?? row.roundNumber;
          row.roundResult = payload.roundResult ?? row.roundResult;
          if (payload.payout !== undefined) row.payout = payload.payout;
          if (payload.payoutAmount !== undefined) row.payoutAmount = payload.payoutAmount;
          if (payload.maxPayoutDeduct !== undefined)
            row.maxPayoutDeduct = payload.maxPayoutDeduct;
          await this.betHistoryRepo.save(row);
          referenceId = row.id;
        }
      } else if (data.skipPublish && data.metadata?.roundNumber) {
        // Deduct job: find bet_history to get referenceId (same as win row)
        const row = await this.findBetHistoryForUpdate(
          data.userId,
          gameTypeVal,
          data.metadata.roundNumber as string,
        );
        if (row) referenceId = row.id;
      }

      // Lose: only update bet_histories (pending -> lost), no point_transaction audit
      if (data.skipPointTransaction) {
        return {
          success: true,
          betHistoryOnly: true,
          userId: data.userId,
        };
      }

      // 2) Persist PointTransaction; keep original referenceType, add referenceId from bet_history when available
      const tx = this.pointTransactionRepo.create({
        userId: data.userId,
        type: data.pointTransactionType,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        category: data.category,
        referenceType: data.referenceType,
        referenceId: referenceId ?? data.referenceId,
        description: data.description,
        descriptionKo: data.descriptionKo,
        metadata: {
          ...(data.metadata || {}),
          txRef: data.txRef,
          type: data.type,
          gameType: data.gameType,
        },
        createdAt,
      });

      await this.pointTransactionRepo.save(tx);

      // 3) Publish POINT_UPDATED unless skipPublish (e.g. deduct audit-only)
      if (!data.skipPublish) {
        const eventData = {
          userId: data.userId,
          pointsDelta: formatPoints(data.pointsDelta),
          previousPoints: formatPoints(data.previousPoints),
          newPoints: formatPoints(data.newPoints),
          transactionType: data.pointTransactionType,
          updatedAt: createdAt,
          source: 'minigame_callback' as const,
        };

        const delayMap: Record<string, number> = {
          slot: 2500,
          plinko: 5000,
        };
        const delayMs =
          data.gameType && delayMap[data.gameType] !== undefined
            ? delayMap[data.gameType]
            : 0;

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        await this.redisService.publishEvent(
          RedisChannel.POINT_UPDATED as string,
          eventData,
        );
      }

      return {
        success: true,
        transactionId: tx.id,
        betHistoryId: referenceId,
        userId: data.userId,
      };
    } catch (error) {
      this.logger.error(
        'GamePointLogProcessor error',
        {
          jobId: job.id,
          data,
          error: (error as Error).message,
        },
        'game-point-log',
      );
      // IMPORTANT: rethrow so BullMQ marks job as failed and keeps it (removeOnFail=false)
      throw error;
    }
  }
}
