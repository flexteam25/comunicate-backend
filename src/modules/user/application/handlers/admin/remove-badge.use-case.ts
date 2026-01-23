import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadge } from '../../../domain/entities/user-badge.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RemoveBadgeCommand {
  userId: string;
  badgeId: string | string[];
}

@Injectable()
export class RemoveBadgeUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
  ) {}

  async execute(command: RemoveBadgeCommand): Promise<void> {
    const badgeIdsInput = Array.isArray(command.badgeId)
      ? command.badgeId
      : [command.badgeId];
    const badgeIds = Array.from(new Set(badgeIdsInput));

    if (badgeIds.length === 0) {
      throw badRequest(MessageKeys.BADGEID_REQUIRED || 'BADGEID_REQUIRED');
    }
    if (badgeIds.length > 20) {
      throw badRequest(MessageKeys.BADGEID_TOO_MANY || 'BADGEID_TOO_MANY');
    }

    // Check if user exists (with profile for points)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw notFound(MessageKeys.USER_NOT_FOUND);
    }

    // Load all user badges for given badgeIds and ensure they exist
    const userBadges: UserBadge[] = [];
    for (const badgeId of badgeIds) {
      const userBadge = await this.userBadgeRepository.findByUserAndBadge(
        command.userId,
        badgeId,
      );
      if (!userBadge) {
        throw badRequest(MessageKeys.BADGE_NOT_ASSIGNED_TO_USER, { badgeId });
      }
      userBadges.push(userBadge);
    }

    // Handle point deduction for all badges (if user has profile & points)
    if (user.userProfile) {
      let currentPoints = user.userProfile.points ?? 0;

      for (const userBadge of userBadges) {
        if (
          userBadge.badge &&
          typeof userBadge.badge.point === 'number' &&
          userBadge.badge.point > 0
        ) {
          const badgePoint = userBadge.badge.point;
          const previousPoints = currentPoints;
          const newPoints = Math.max(0, previousPoints - badgePoint);
          const pointsDeducted = previousPoints - newPoints; // Amount actually deducted

          currentPoints = newPoints;

          const transaction = this.pointTransactionRepository.create({
            userId: command.userId,
            type: PointTransactionType.SPEND,
            amount: -pointsDeducted, // Negative for deduction
            balanceAfter: newPoints,
            category: 'badge_removal',
            referenceType: 'user_badge',
            referenceId: userBadge.id,
            description: `Badge removed: ${userBadge.badge.name} (Badge ID: ${userBadge.badgeId}, User Badge ID: ${userBadge.id})${
              previousPoints < badgePoint
                ? ' (insufficient points, deducted to minimum 0)'
                : ''
            }`,
            descriptionKo: `배지 제거: ${userBadge.badge.name}`,
          });
          await this.pointTransactionRepository.save(transaction);
        }
      }

      // Ensure points never go negative (safety check)
      user.userProfile.points = Math.max(0, currentPoints);
      await this.userRepository.save(user);
    }

    // Remove badges
    for (const badgeId of badgeIds) {
      await this.userBadgeRepository.removeBadge(command.userId, badgeId);
    }
  }
}
