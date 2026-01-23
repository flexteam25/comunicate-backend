import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IPointSettingRepository } from '../../infrastructure/persistence/repositories/point-setting.repository';
import {
  PointTransaction,
  PointTransactionType,
} from '../../domain/entities/point-transaction.entity';
import { UserProfile } from '../../../user/domain/entities/user-profile.entity';
import { badRequest, MessageKeys } from '../../../../shared/exceptions/exception-helpers';
import { RedisService } from '../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../shared/logger/logger.service';

export interface RewardPointsCommand {
  userId: string;
  pointSettingKey: string;
  category: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  descriptionKo?: string;
  metadata?: Record<string, any>;
  overridePoints?: number; // Override points from point_settings (e.g., from category.point)
  requireSufficientPoints?: boolean; // If true, throw error when insufficient points (for spending), default: false (cap at 0)
}

/**
 * Service to handle point rewards based on point_settings
 * - Fetches point value from point_settings by key
 * - Creates PointTransaction (even if points = 0 for history)
 * - Updates user profile points
 * - Publishes realtime point update event
 * - Never throws errors if setting not found or points = 0
 */
@Injectable()
export class PointRewardService {
  constructor(
    @Inject('IPointSettingRepository')
    private readonly pointSettingRepository: IPointSettingRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Reward points to user based on point setting key
   * @param manager EntityManager from transaction
   * @param command Reward command with userId, pointSettingKey, category, etc.
   * @returns PointTransaction created (always creates transaction, even if points = 0 for audit trail)
   */
  async rewardPoints(
    manager: EntityManager,
    command: RewardPointsCommand,
  ): Promise<PointTransaction | null> {
    // Get point setting (don't throw if not found)
    const pointSetting = await this.pointSettingRepository.findByKey(
      command.pointSettingKey,
    );

    // Use overridePoints if provided, otherwise use point from point_settings
    // If setting not found or points = 0, still create transaction with 0 points for history
    const points =
      command.overridePoints !== undefined
        ? command.overridePoints
        : (pointSetting?.point ?? 0);

    // Get or create user profile
    const userProfileRepo = manager.getRepository(UserProfile);
    let userProfile = await userProfileRepo.findOne({
      where: { userId: command.userId },
    });

    if (!userProfile) {
      // Create profile if doesn't exist
      userProfile = userProfileRepo.create({
        userId: command.userId,
        points: 0,
      });
      await userProfileRepo.save(userProfile);
    }

    const currentPoints = userProfile.points ?? 0;

    // Check if user has sufficient points when spending (if requireSufficientPoints is true)
    if (command.requireSufficientPoints && points < 0) {
      const requiredPoints = Math.abs(points);
      if (currentPoints < requiredPoints) {
        throw badRequest(MessageKeys.INSUFFICIENT_POINTS);
      }
    }

    // Calculate new points, but prevent negative balance
    // If points is negative and would make balance negative, cap at 0 (unless requireSufficientPoints is true)
    const newPoints = command.requireSufficientPoints
      ? currentPoints + points // Will throw error above if insufficient
      : Math.max(0, currentPoints + points);
    const balanceAfter = newPoints;

    // Calculate actual amount deducted/earned
    // For negative points: if insufficient, only deduct what's available
    // For positive points: use as is
    let actualAmount: number;
    if (points < 0) {
      // For SPEND: actual amount is the difference (negative)
      const actualPointsDeducted = currentPoints - balanceAfter;
      actualAmount = -actualPointsDeducted; // Negative for SPEND
    } else {
      // For EARN: use points as is (positive)
      actualAmount = points;
    }

    // Determine transaction type based on points
    // EARN for positive points, SPEND for negative points, EARN for 0
    const transactionType =
      points > 0
        ? PointTransactionType.EARN
        : points < 0
          ? PointTransactionType.SPEND
          : PointTransactionType.EARN;

    // Create point transaction (even if points = 0 for audit trail)
    const pointTransactionRepo = manager.getRepository(PointTransaction);
    const transaction = pointTransactionRepo.create({
      userId: command.userId,
      type: transactionType,
      amount: actualAmount, // Actual amount deducted/earned (negative for SPEND, positive for EARN)
      balanceAfter,
      category: command.category,
      referenceType: command.referenceType,
      referenceId: command.referenceId,
      description: command.description || `Point reward: ${command.pointSettingKey}`,
      descriptionKo: command.descriptionKo || null,
      metadata: {
        ...command.metadata,
        pointSettingKey: command.pointSettingKey,
        pointSettingFound: pointSetting !== null,
        previousPoints: currentPoints,
        newPoints: balanceAfter,
        pointsRequested: points, // Original points requested (can be negative)
        pointsActual: actualAmount, // Actual points deducted/earned (may differ if insufficient)
        pointsWereCapped: points < 0 && currentPoints + points < 0, // True if points were capped to prevent negative
      },
    });

    const savedTransaction = await pointTransactionRepo.save(transaction);

    // Update user profile points if points changed
    // Ensure points never go negative (safety check)
    if (points !== 0) {
      userProfile.points = Math.max(0, balanceAfter);
      await userProfileRepo.save(userProfile);
    }

    // Publish point updated event to Redis (after transaction commits)
    // Only publish if points actually changed (points !== 0)
    if (points !== 0) {
      const eventData = {
        userId: command.userId,
        pointsDelta: actualAmount, // Actual amount (positive for EARN, negative for SPEND)
        previousPoints: currentPoints,
        newPoints: balanceAfter,
        transactionType: transactionType,
        updatedAt: new Date(),
      };

      // Publish event after transaction (fire and forget)
      setImmediate(() => {
        this.redisService
          .publishEvent(RedisChannel.POINT_UPDATED as string, eventData)
          .catch((error) => {
            this.logger.error(
              'Failed to publish point:updated event',
              {
                error: error instanceof Error ? error.message : String(error),
                userId: command.userId,
                pointSettingKey: command.pointSettingKey,
                category: command.category,
              },
              'point',
            );
          });
      });
    }

    return savedTransaction;
  }
}
