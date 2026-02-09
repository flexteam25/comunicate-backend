import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { UserProfile } from '../../../user/domain/entities/user-profile.entity';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../point/domain/entities/point-transaction.entity';
import { CreatePointTransactionUseCase } from '../../../point/application/handlers/create-point-transaction.use-case';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../shared/logger/logger.service';
import { formatPoints } from '../../../../shared/utils/point.util';
import { GetGameBetLimitsService } from '../../../system-settings/application/services/get-game-bet-limits.service';

export type GameCallbackResult =
  | { status: 'OK'; newBalance?: number }
  | { status: 'REJECT'; message?: string }
  | { status: 'AlreadyProcessed' }
  | { status: 'PlayerNotFound' }
  | { status: 'InsufficientPlayerBalance' };

export interface GameCallbackCommand {
  type: 'bet' | 'cancel_bet' | 'win' | 'lose' | 'refund';
  res: number;
  amount: number;
  userUuid: string;
  txRef: string;
  roundId?: string;
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
    private readonly createPointTransactionUseCase: CreatePointTransactionUseCase,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly getGameBetLimitsService: GetGameBetLimitsService,
  ) {}

  private publishPointUpdated(
    userId: string,
    pointsDelta: number,
    previousPoints: number,
    newPoints: number,
    transactionType: PointTransactionType,
    gameType?: string,
  ): void {
    const eventData = {
      userId,
      pointsDelta: formatPoints(pointsDelta),
      previousPoints: formatPoints(previousPoints),
      newPoints: formatPoints(newPoints),
      transactionType,
      updatedAt: new Date(),
      source: 'minigame_callback' as const,
    };
    const delayMap: Record<string, number> = {
      slot: 2500,
      plinko: 5000,
    };
    const delayMs =
      gameType && delayMap[gameType] !== undefined ? delayMap[gameType] : 0;
    setTimeout(() => {
      this.redisService
        .publishEvent(RedisChannel.POINT_UPDATED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish point:updated event',
            {
              error: error instanceof Error ? error.message : String(error),
              userId,
              gameType,
              delayMs,
            },
            'minigame',
          );
        });
    }, delayMs);
  }

  async execute(command: GameCallbackCommand): Promise<GameCallbackResult> {
    const { type, amount, userUuid, txRef, roundId, gameType } = command;

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

    switch (type) {
      case 'bet': {
        // Enforce game bet limits: read from cache, fallback database
        const limits = await this.getGameBetLimitsService.get();
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
        await this.createPointTransactionUseCase.execute({
          userId: userUuid,
          type: PointTransactionType.SPEND,
          amount: -amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_bet',
          referenceId: undefined,
          description: `Game bet: ${gameType || 'game'}`,
          descriptionKo: `미니게임 베팅${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
        });
        this.publishPointUpdated(
          userUuid,
          -amountNum,
          balanceBefore,
          balanceAfter,
          PointTransactionType.SPEND,
          gameType,
        );
        return { status: 'OK', newBalance: balanceAfter };
      }
      case 'cancel_bet': {
        const balanceAfter = balanceBefore + amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);
        await this.createPointTransactionUseCase.execute({
          userId: userUuid,
          type: PointTransactionType.REFUND,
          amount: amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_bet_cancel',
          description: `Game cancel bet: ${gameType || 'game'}`,
          descriptionKo: `미니게임 베팅 취소${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
        });
        this.publishPointUpdated(
          userUuid,
          amountNum,
          balanceBefore,
          balanceAfter,
          PointTransactionType.REFUND,
          gameType,
        );
        return { status: 'OK' };
      }
      case 'win': {
        const balanceAfter = balanceBefore + amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);
        await this.createPointTransactionUseCase.execute({
          userId: userUuid,
          type: PointTransactionType.EARN,
          amount: amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_win',
          description: `Game win: ${gameType || 'game'}`,
          descriptionKo: `미니게임 당첨${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
        });
        this.publishPointUpdated(
          userUuid,
          amountNum,
          balanceBefore,
          balanceAfter,
          PointTransactionType.EARN,
          gameType,
        );
        return { status: 'OK' };
      }
      case 'lose': {
        await this.createPointTransactionUseCase.execute({
          userId: userUuid,
          type: PointTransactionType.SPEND,
          amount: 0,
          balanceAfter: balanceBefore,
          category: 'minigame_callback',
          referenceType: 'game_lose',
          description: `Game lose: ${gameType || 'game'}`,
          descriptionKo: `미니게임 패배${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId, amount: amountNum },
        });
        this.publishPointUpdated(
          userUuid,
          0,
          balanceBefore,
          balanceBefore,
          PointTransactionType.SPEND,
          gameType,
        );
        return { status: 'OK' };
      }
      case 'refund': {
        const balanceAfter = balanceBefore + amountNum;
        profile.points = balanceAfter;
        await this.userProfileRepo.save(profile);
        await this.createPointTransactionUseCase.execute({
          userId: userUuid,
          type: PointTransactionType.REFUND,
          amount: amountNum,
          balanceAfter,
          category: 'minigame_callback',
          referenceType: 'game_refund',
          description: `Game refund: ${gameType || 'game'}`,
          descriptionKo: `미니게임 환불${gameType ? ` (${gameType})` : ''}`,
          metadata: { txRef, type, gameType, roundId },
        });
        this.publishPointUpdated(
          userUuid,
          amountNum,
          balanceBefore,
          balanceAfter,
          PointTransactionType.REFUND,
          gameType,
        );
        return { status: 'OK' };
      }
      default:
        return { status: 'REJECT', message: 'Invalid type' };
    }
  }
}
