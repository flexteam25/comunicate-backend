import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  UserBadgeRequest,
  UserBadgeRequestStatus,
} from '../../../domain/entities/user-badge-request.entity';
import { UserBadge } from '../../../domain/entities/user-badge.entity';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { IUserBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/user-badge-request.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IBadgeRepository } from '../../../../badge/infrastructure/persistence/repositories/badge.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface ApproveUserBadgeRequestCommand {
  requestId: string;
  adminId: string;
  note?: string;
  handlePoint?: boolean;
}

@Injectable()
export class ApproveUserBadgeRequestUseCase {
  constructor(
    @Inject('IUserBadgeRequestRepository')
    private readonly badgeRequestRepository: IUserBadgeRequestRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ApproveUserBadgeRequestCommand): Promise<UserBadgeRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(UserBadgeRequest);
        const userBadgeRepo = manager.getRepository(UserBadge);
        const pointTransactionRepo = manager.getRepository(PointTransaction);

        // Lock request row with pessimistic lock
        const request = await requestRepo
          .createQueryBuilder('request')
          .where('request.id = :id', { id: command.requestId })
          .setLock('pessimistic_write')
          .getOne();

        if (!request) {
          throw notFound(MessageKeys.USER_BADGE_REQUEST_NOT_FOUND);
        }

        // Check status is pending
        if (request.status !== UserBadgeRequestStatus.PENDING) {
          throw badRequest(MessageKeys.BADGE_REQUEST_ALREADY_PROCESSED);
        }

        // Validate badge is still active and not deleted at approval time
        const badge = await this.badgeRepository.findByIdIncludingDeleted(
          request.badgeId,
        );
        if (!badge) {
          throw notFound(MessageKeys.BADGE_NOT_FOUND);
        }
        if (badge.deletedAt) {
          throw badRequest(MessageKeys.BADGE_ALREADY_DELETED);
        }
        if (!badge.isActive) {
          throw badRequest(MessageKeys.BADGE_NOT_AVAILABLE);
        }

        // Double-check user doesn't already have this badge (handle race condition)
        const existingBadge = await userBadgeRepo.findOne({
          where: {
            userId: request.userId,
            badgeId: request.badgeId,
          },
        });

        if (existingBadge) {
          throw badRequest(MessageKeys.BADGE_ALREADY_ASSIGNED_TO_USER);
        }

        // Update request
        request.status = UserBadgeRequestStatus.APPROVED;
        request.adminId = command.adminId;
        request.note = command.note || null;
        await requestRepo.save(request);

        // Assign badge to user with active = false
        const userBadge = userBadgeRepo.create({
          userId: request.userId,
          badgeId: request.badgeId,
          active: false,
        });
        await userBadgeRepo.save(userBadge);

        // Handle point reward if requested and badge has point
        if (command.handlePoint && typeof badge.point === 'number' && badge.point > 0) {
          const user = await this.userRepository.findById(request.userId, [
            'userProfile',
          ]);
          if (user && user.userProfile) {
            const currentPoints = user.userProfile.points ?? 0;
            const newPoints = currentPoints + badge.point;

            user.userProfile.points = newPoints;
            await manager.save(user.userProfile);

            const transaction = pointTransactionRepo.create({
              userId: request.userId,
              type: PointTransactionType.EARN,
              amount: badge.point,
              balanceAfter: newPoints,
              category: 'badge_reward',
              referenceType: 'badge',
              referenceId: badge.id,
              description: `Badge reward: ${badge.name}`,
            });
            await pointTransactionRepo.save(transaction);
          }
        }

        // Reload with relations
        const reloaded = await requestRepo.findOne({
          where: { id: request.id },
          relations: ['user', 'badge', 'admin', 'images'],
        });

        if (!reloaded) {
          throw notFound(MessageKeys.USER_BADGE_REQUEST_NOT_FOUND_AFTER_UPDATE);
        }

        return reloaded;
      },
    );
  }
}
