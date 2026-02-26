import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { UserProfile } from '../../../user/domain/entities/user-profile.entity';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../point/domain/entities/point-transaction.entity';
import { GetGameBetLimitsService } from '../../../system-settings/application/services/get-game-bet-limits.service';
import { MinigamePlayingStateService } from '../services/minigame-playing-state.service';
import { QueueService } from '../../../../shared/queue/queue.service';
import { GamePointLogJobData } from '../../../../shared/queue/processors/game-point-log.processor';
import { MaintenanceCheckService } from '../../../system-settings/application/services/maintenance-check.service';

export type GameCallbackResult =
  | { status: 'OK'; newBalance?: number; actualAmount?: number }
  | { status: 'REJECT'; message?: string }
  | { status: 'AlreadyProcessed' }
  | { status: 'PlayerNotFound' }
  | { status: 'InsufficientPlayerBalance' };

export interface GameCallbackCommand {
  type: 'bet' | 'cancel_bet' | 'win' | 'lose' | 'draw' | 'refund';
  res: number;
  amount: number;
  userUuid: string;
  txRef: string;
  roundId?: string;
  roundNumber?: string;
  betAmount?: number;
  payout?: number;
  roundResult?: string;
  coinType?: string;
  gameType?: string;
}

@Injectable()
export class HandleGameCallbackUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepo: Repository<PointTransaction>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepo: Repository<UserProfile>,
    private readonly queueService: QueueService,
    private readonly getGameBetLimitsService: GetGameBetLimitsService,
    private readonly minigamePlayingStateService: MinigamePlayingStateService,
    private readonly maintenanceCheckService: MaintenanceCheckService,
  ) {}

  async execute(command: GameCallbackCommand): Promise<GameCallbackResult> {
    const {
      type,
      amount,
      userUuid,
      txRef,
      roundId,
      roundNumber,
      payout,
      roundResult,
      coinType,
      gameType,
    } = command;

    const maintenance = await this.maintenanceCheckService.getMaintenance();
    if (maintenance.status === 1) {
      return { status: 'REJECT', message: 'Game is under maintenance' };
    }

    const existing = await this.pointTransactionRepo
      .createQueryBuilder('t')
      .where("t.metadata->>'txRef' = :txRef", { txRef })
      .andWhere("t.category = 'minigame_callback'")
      .getOne();
    if (existing) {
      return { status: 'AlreadyProcessed' };
    }

    const user = await this.userRepository.findById(userUuid, ['userProfile']);
    if (!user || !user.userProfile) {
      return { status: 'PlayerNotFound' };
    }

    const profile = user.userProfile;
    const balanceBefore = Number(profile.points ?? 0);
    const amountNum = Number(amount);
    const limits = await this.getGameBetLimitsService.get();
    const isGameInMaintenance = (gt: string | undefined) =>
      gt != null && limits[gt]?.maintenance === 1;

    switch (type) {
      case 'bet': {
        if (isGameInMaintenance(gameType)) {
          return { status: 'REJECT', message: 'Game is under maintenance' };
        }
        if (gameType) {
          await this.minigamePlayingStateService.setPlaying(userUuid, gameType);
        }
        // type=bet with negative amount: treat as cancel_bet (refund)
        if (amountNum < 0) {
          const refundAmount = Math.abs(amountNum);
          const balanceAfter = balanceBefore + refundAmount;
          profile.points = balanceAfter;
          await this.userProfileRepo.save(profile);

          const createdAt = new Date().toISOString();
          const jobData: GamePointLogJobData = {
            userId: userUuid,
            txRef,
            type: 'cancel_bet',
            pointTransactionType: PointTransactionType.REFUND,
            amount: refundAmount,
            balanceAfter,
            category: 'minigame_callback',
            referenceType: 'game_bet_cancel',
            description: `Game cancel bet: ${gameType || 'game'}`,
            descriptionKo: `미니게임 베팅 취소${gameType ? ` (${gameType})` : ''}`,
            metadata: { txRef, type: 'bet', amount: amountNum, gameType, roundId },
            pointsDelta: refundAmount,
            previousPoints: balanceBefore,
            newPoints: balanceAfter,
            gameType,
            createdAt,
            betHistoryUpdate: {
              roundNumber,
              roundResult: 'cancelled',
              payout: 0,
              payoutAmount: 0,
              maxPayoutDeduct: 0,
            },
          };
          await this.queueService.addGamePointLogJob(jobData);
          return { status: 'OK', newBalance: balanceAfter };
        }

        // Enforce game bet limits
        const key = gameType && limits[gameType] ? gameType : undefined;
        if (!key) {
          return {
            status: 'REJECT',
            message: 'Bet limits not configured for gameType',
          };
        }
        const limit = limits[key];
        if (amountNum < limit.minBet || amountNum > limit.maxBet) {
          return {
            status: 'REJECT',
            message: 'Bet amount out of allowed range',
          };
        }

        if (balanceBefore < amountNum) {
          return { status: 'InsufficientPlayerBalance' };
        }
        const balanceAfter = balanceBefore - amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);

        const gameTypeVal = gameType || 'game';
        const createdAt = new Date().toISOString();
        const jobData: GamePointLogJobData = {
          userId: userUuid,
          txRef,
          type,
          pointTransactionType: PointTransactionType.SPEND,
          amount: -amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_bet',
          description: `Game bet: ${gameTypeVal}`,
          descriptionKo: `미니게임 베팅${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
          pointsDelta: -amountNum,
          previousPoints: balanceBefore,
          newPoints: balanceAfter,
          gameType,
          createdAt,
          betHistoryCreate: {
            roundNumber: roundNumber ?? null,
            betAmount: amountNum,
            roundResult: roundResult || 'pending',
            coinType: coinType || 'point',
          },
        };
        await this.queueService.addGamePointLogJob(jobData);
        return { status: 'OK', newBalance: balanceAfter };
      }
      case 'cancel_bet': {
        if (isGameInMaintenance(gameType)) {
          return { status: 'REJECT', message: 'Game is under maintenance' };
        }
        if (gameType) {
          await this.minigamePlayingStateService.setPlaying(userUuid, gameType);
        }
        const balanceAfter = balanceBefore + amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);

        const createdAt = new Date().toISOString();
        const jobData: GamePointLogJobData = {
          userId: userUuid,
          txRef,
          type,
          pointTransactionType: PointTransactionType.REFUND,
          amount: amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_bet_cancel',
          referenceId: undefined,
          description: `Game cancel bet: ${gameType || 'game'}`,
          descriptionKo: `미니게임 베팅 취소${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
          pointsDelta: amountNum,
          previousPoints: balanceBefore,
          newPoints: balanceAfter,
          gameType,
          createdAt,
        };
        await this.queueService.addGamePointLogJob(jobData);
        return { status: 'OK', newBalance: balanceAfter };
      }
      case 'win': {
        if (isGameInMaintenance(gameType)) {
          return { status: 'REJECT', message: 'Game is under maintenance' };
        }
        if (gameType) {
          await this.minigamePlayingStateService.setPlaying(userUuid, gameType);
        }
        const gameTypeVal = gameType || 'game';
        const limit = limits[gameTypeVal];
        const maxPayoutAmount = limit
          ? Number(limit.maxPayoutAmount)
          : Number.POSITIVE_INFINITY;
        const actualAmount = Math.min(amountNum, maxPayoutAmount);
        const balanceAfter = balanceBefore + actualAmount;
        const capped = actualAmount < amountNum;
        const deductAmount = capped ? amountNum - actualAmount : 0;

        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);

        const createdAt = new Date().toISOString();
        // When capped: log win full amount first (balance_after = balance before + full), then deduct row has balance_after = final
        const balanceAfterFullWin = balanceBefore + amountNum;
        const winJobData: GamePointLogJobData = {
          userId: userUuid,
          txRef,
          type: 'win',
          pointTransactionType: PointTransactionType.EARN,
          amount: capped ? amountNum : actualAmount,
          balanceAfter: capped ? balanceAfterFullWin : balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_win',
          description: `Game win: ${gameTypeVal}${capped ? ' (capped)' : ''}`,
          descriptionKo: `미니게임 당첨${gameType ? ` (${gameType})` : ''}${capped ? ' (상한적용)' : ''}`,
          metadata: {
            txRef,
            type: 'win',
            gameType,
            roundId,
            payout,
            maxPayoutDeduct: deductAmount,
          },
          pointsDelta: actualAmount,
          previousPoints: balanceBefore,
          newPoints: balanceAfter,
          gameType,
          createdAt,
          betHistoryUpdate: {
            roundNumber,
            roundResult: roundResult || 'win',
            payout: payout ?? 0,
            payoutAmount: actualAmount,
            maxPayoutDeduct: deductAmount,
          },
        };
        await this.queueService.addGamePointLogJob(winJobData);
        if (capped && deductAmount > 0) {
          const deductJobData: GamePointLogJobData = {
            userId: userUuid,
            txRef: `${txRef}_deduct`,
            type: 'win',
            pointTransactionType: PointTransactionType.SPEND,
            amount: -deductAmount,
            balanceAfter,
            category: 'minigame_callback',
            referenceType: 'game_win_deduct',
            description: `Game win max payout deduct: ${gameTypeVal}`,
            descriptionKo: `미니게임 당첨 상한 초과 차감 (${gameTypeVal})`,
            metadata: {
              txRef,
              type: 'win',
              gameType,
              roundNumber,
              maxPayoutDeduct: deductAmount,
            },
            pointsDelta: -deductAmount,
            previousPoints: balanceAfterFullWin,
            newPoints: balanceAfter,
            gameType,
            createdAt: new Date().toISOString(),
            skipPublish: true,
          };
          await this.queueService.addGamePointLogJob(deductJobData);
        }

        return { status: 'OK', newBalance: balanceAfter, actualAmount };
      }
      case 'lose': {
        if (isGameInMaintenance(gameType)) {
          return { status: 'REJECT', message: 'Game is under maintenance' };
        }
        if (gameType) {
          await this.minigamePlayingStateService.setPlaying(userUuid, gameType);
        }
        const gameTypeVal = gameType || 'game';
        const createdAt = new Date().toISOString();
        const jobData: GamePointLogJobData = {
          userId: userUuid,
          txRef,
          type: 'lose',
          pointTransactionType: PointTransactionType.SPEND,
          amount: 0,
          balanceAfter: balanceBefore,
          category: 'minigame_callback',
          referenceType: 'game_lose',
          description: '',
          descriptionKo: '',
          metadata: { txRef, type: 'lose', gameType, roundId },
          pointsDelta: 0,
          previousPoints: balanceBefore,
          newPoints: balanceBefore,
          gameType,
          createdAt,
          betHistoryUpdate: {
            roundNumber,
            roundResult: roundResult || 'lost',
            payout: payout ?? 0,
            payoutAmount: 0,
            maxPayoutDeduct: 0,
          },
          skipPointTransaction: true,
        };
        await this.queueService.addGamePointLogJob(jobData);
        return { status: 'OK', newBalance: balanceBefore };
      }
      case 'draw': {
        if (isGameInMaintenance(gameType)) {
          return { status: 'REJECT', message: 'Game is under maintenance' };
        }
        if (gameType) {
          await this.minigamePlayingStateService.setPlaying(userUuid, gameType);
        }
        const gameTypeVal = gameType || 'game';
        const balanceAfter = balanceBefore + amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);

        const createdAt = new Date().toISOString();
        const jobData: GamePointLogJobData = {
          userId: userUuid,
          txRef,
          type: 'draw',
          pointTransactionType: PointTransactionType.REFUND,
          amount: amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_draw',
          description: `Game draw: ${gameTypeVal}`,
          descriptionKo: `미니게임 무승부${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type: 'draw', gameType, roundId },
          pointsDelta: amountNum,
          previousPoints: balanceBefore,
          newPoints: balanceAfter,
          gameType,
          createdAt,
          betHistoryUpdate: {
            roundNumber,
            roundResult: roundResult || 'draw',
            payout: payout ?? 1,
            payoutAmount: amountNum,
            maxPayoutDeduct: 0,
          },
        };
        await this.queueService.addGamePointLogJob(jobData);
        return { status: 'OK', newBalance: balanceAfter };
      }
      case 'refund': {
        if (isGameInMaintenance(gameType)) {
          return { status: 'REJECT', message: 'Game is under maintenance' };
        }
        if (gameType) {
          await this.minigamePlayingStateService.setPlaying(userUuid, gameType);
        }
        const balanceAfter = balanceBefore + amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);

        const createdAt = new Date().toISOString();
        const jobData: GamePointLogJobData = {
          userId: userUuid,
          txRef,
          type,
          pointTransactionType: PointTransactionType.REFUND,
          amount: amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_refund',
          description: `Game refund: ${gameType || 'game'}`,
          descriptionKo: `미니게임 환불${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
          pointsDelta: amountNum,
          previousPoints: balanceBefore,
          newPoints: balanceAfter,
          gameType,
          createdAt,
        };
        await this.queueService.addGamePointLogJob(jobData);
        return { status: 'OK', newBalance: balanceAfter };
      }
      default:
        return { status: 'REJECT', message: 'Invalid type' };
    }
  }
}
