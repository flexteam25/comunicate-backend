import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IPointSettingRepository } from '../../infrastructure/persistence/repositories/point-setting.repository';
import {
  PointTransaction,
  PointTransactionType,
} from '../../domain/entities/point-transaction.entity';
import { UserProfile } from '../../../user/domain/entities/user-profile.entity';

export interface RewardPointsCommand {
  userId: string;
  pointSettingKey: string;
  category: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  descriptionKo?: string;
  metadata?: Record<string, any>;
}

/**
 * Service to handle point rewards based on point_settings
 * - Fetches point value from point_settings by key
 * - Creates PointTransaction (even if points = 0 for history)
 * - Updates user profile points
 * - Never throws errors if setting not found or points = 0
 */
@Injectable()
export class PointRewardService {
  constructor(
    @Inject('IPointSettingRepository')
    private readonly pointSettingRepository: IPointSettingRepository,
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

    // If setting not found or points = 0, still create transaction with 0 points for history
    const points = pointSetting?.point ?? 0;

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
    const newPoints = currentPoints + points;
    const balanceAfter = newPoints;

    // Create point transaction (even if points = 0 for audit trail)
    const pointTransactionRepo = manager.getRepository(PointTransaction);
    const transaction = pointTransactionRepo.create({
      userId: command.userId,
      type: points > 0 ? PointTransactionType.EARN : PointTransactionType.EARN, // Still EARN even if 0
      amount: points,
      balanceAfter,
      category: command.category,
      referenceType: command.referenceType,
      referenceId: command.referenceId,
      description:
        command.description ||
        `Point reward: ${command.pointSettingKey} (${points} points)`,
      descriptionKo: command.descriptionKo || null,
      metadata: {
        ...command.metadata,
        pointSettingKey: command.pointSettingKey,
        pointSettingFound: pointSetting !== null,
        previousPoints: currentPoints,
        newPoints: balanceAfter,
        pointsAwarded: points,
      },
    });

    const savedTransaction = await pointTransactionRepo.save(transaction);

    // Update user profile points if points changed
    if (points !== 0) {
      userProfile.points = balanceAfter;
      await userProfileRepo.save(userProfile);
    }

    return savedTransaction;
  }
}
