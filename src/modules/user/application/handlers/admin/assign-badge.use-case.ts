import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import { Badge, BadgeType } from '../../../../badge/domain/entities/badge.entity';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { Repository, In, EntityManager } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserBadge } from '../../../domain/entities/user-badge.entity';
import { UserProfile } from '../../../domain/entities/user-profile.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { TransactionService } from '../../../../../shared/services/transaction.service';

export interface AssignBadgeCommand {
  userId: string;
  badgeId: string | string[];
}

@Injectable()
export class AssignBadgeUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: AssignBadgeCommand): Promise<UserBadge[]> {
    const badgeIdsInput = Array.isArray(command.badgeId)
      ? command.badgeId
      : [command.badgeId];
    const badgeIds = Array.from(new Set(badgeIdsInput)); // de-duplicate

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

    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const badgeRepo = manager.getRepository(Badge);
        const userBadgeRepo = manager.getRepository(UserBadge);
        const userProfileRepo = manager.getRepository(UserProfile);
        const pointTxRepo = manager.getRepository(PointTransaction);

        // Load and validate all badges
        const badges = await badgeRepo.find({
          where: {
            id: In(badgeIds),
            deletedAt: null,
            isActive: true,
            badgeType: BadgeType.USER,
          },
        });

        if (badges.length !== badgeIds.length) {
          const existingIds = new Set(badges.map((b) => b.id));
          const missingId = badgeIds.find((id) => !existingIds.has(id));
          throw badRequest(MessageKeys.BADGE_NOT_AVAILABLE, { badgeId: missingId });
        }

        // Find existing user badges; if any overlap, fail the whole request
        const existingUserBadges = await userBadgeRepo.find({
          where: {
            userId: command.userId,
            badgeId: In(badgeIds),
          },
        });
        if (existingUserBadges.length > 0) {
          // Return first conflicting badgeId (frontend can show which one is duplicated)
          const conflictBadgeId = existingUserBadges[0].badgeId;
          throw badRequest(MessageKeys.BADGE_ALREADY_ASSIGNED_TO_USER, {
            badgeId: conflictBadgeId,
          });
        }

        let currentPoints = user.userProfile?.points ?? 0;
        const originalPoints = currentPoints;

        for (const badgeId of badgeIds) {
          const badge = badges.find((b) => b.id === badgeId);
          if (!badge) {
            // Should not happen due to check above, but keep as safety
            throw badRequest(MessageKeys.BADGE_NOT_AVAILABLE, { badgeId });
          }

          const userBadge = userBadgeRepo.create({
            userId: command.userId,
            badgeId,
            active: false,
            earnedAt: new Date(),
          });
          await userBadgeRepo.save(userBadge);

          // Handle point reward only for newly assigned badges
          if (typeof badge.point === 'number' && badge.point > 0) {
            const previousPoints = currentPoints;
            const newPoints = previousPoints + badge.point;
            currentPoints = newPoints;

            const transaction = pointTxRepo.create({
              userId: command.userId,
              type: PointTransactionType.EARN,
              amount: badge.point,
              balanceAfter: newPoints,
              category: 'badge_reward',
              referenceType: 'user_badge',
              referenceId: userBadge.id,
              description: `Badge reward: ${badge.name} (Badge ID: ${badge.id}, User Badge ID: ${userBadge.id})`,
              descriptionKo: `배지 보상: ${badge.name}`,
            });
            await pointTxRepo.save(transaction);
          }
        }

        // Persist updated user points (if any)
        if (currentPoints !== originalPoints) {
          if (!user.userProfile) {
            const newProfile = userProfileRepo.create({
              userId: user.id,
              points: currentPoints,
            });
            await userProfileRepo.save(newProfile);
            user.userProfile = newProfile;
          } else {
            user.userProfile.points = currentPoints;
            await userProfileRepo.save(user.userProfile);
          }
        }

        // Return all user's badges after assignment
        const allUserBadges = await userBadgeRepo.find({
          where: { userId: command.userId },
        });

        return allUserBadges;
      },
    );
  }
}
