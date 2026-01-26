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
import { RedisService } from '../../../../../shared/redis/redis.service';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';

export interface ApproveUserBadgeRequestCommand {
  requestId: string;
  adminId: string;
  note?: string;
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
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
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

        // Track points for realtime event
        let previousPoints = 0;
        let newPoints = 0;
        let pointsAwarded = 0;

        // Always handle point reward if badge has point
        if (typeof badge.point === 'number' && badge.point > 0) {
          const user = await this.userRepository.findById(request.userId, [
            'userProfile',
          ]);
          if (user && user.userProfile) {
            previousPoints = user.userProfile.points ?? 0;
            newPoints = Math.max(0, previousPoints + badge.point); // Ensure never negative
            pointsAwarded = badge.point;

            user.userProfile.points = newPoints;
            await manager.save(user.userProfile);

            const transaction = pointTransactionRepo.create({
              userId: request.userId,
              type: PointTransactionType.EARN,
              amount: badge.point,
              balanceAfter: newPoints,
              category: 'badge_reward',
              referenceType: 'user_badge_request',
              referenceId: request.id,
              description: `Badge reward: ${badge.name} (Badge ID: ${badge.id}, Request ID: ${request.id})`,
              descriptionKo: `배지 보상: ${badge.name}`,
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

        // Publish realtime events after transaction
        setImmediate(() => {
          // Publish user-badge-request:approved event
          this.publishBadgeRequestApprovedEvent(reloaded).catch((error) => {
            this.logger.error(
              'Failed to publish user-badge-request:approved event',
              {
                error: error instanceof Error ? error.message : String(error),
                requestId: reloaded.id,
                userId: reloaded.userId,
              },
              'user-badge-request',
            );
          });

          // Publish point:updated event if points were awarded
          if (pointsAwarded > 0) {
            this.redisService
              .publishEvent(RedisChannel.POINT_UPDATED as string, {
                userId: reloaded.userId,
                pointsDelta: pointsAwarded,
                previousPoints,
                newPoints,
                transactionType: PointTransactionType.EARN,
                updatedAt: new Date(),
              })
              .catch((error) => {
                this.logger.error(
                  'Failed to publish point:updated event',
                  {
                    error: error instanceof Error ? error.message : String(error),
                    userId: reloaded.userId,
                    pointsDelta: pointsAwarded,
                  },
                  'user-badge-request',
                );
              });
          }
        });

        return reloaded;
      },
    );
  }

  private async publishBadgeRequestApprovedEvent(
    request: UserBadgeRequest,
  ): Promise<void> {
    // Map request to response format (same as API response)
    const eventData = {
      id: request.id,
      userId: request.userId,
      badgeId: request.badgeId,
      adminId: request.adminId || null,
      status: request.status,
      note: request.note || null,
      content: request.content || null,
      images: (request.images || []).map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl || null,
        order: img.order || null,
      })),
      user: request.user
        ? {
            id: request.user.id,
            email: request.user.email,
            displayName: request.user.displayName || null,
          }
        : null,
      badge: request.badge
        ? {
            id: request.badge.id,
            name: request.badge.name,
            description: request.badge.description || null,
            iconUrl: request.badge.iconUrl || null,
            iconName: request.badge.iconName || null,
          }
        : null,
      admin: request.admin
        ? {
            id: request.admin.id,
            email: request.admin.email,
            displayName: request.admin.displayName || null,
          }
        : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };

    await this.redisService.publishEvent(
      RedisChannel.USER_BADGE_REQUEST_APPROVED as string,
      eventData,
    );
  }
}
