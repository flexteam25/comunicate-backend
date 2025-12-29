import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UserProfile } from '../../../domain/entities/user-profile.entity';
import { UserToken } from '../../../../auth/domain/entities/user-token.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';

export interface UpdateUserCommand {
  userId: string;
  adminId: string;
  isActive?: boolean;
  points?: number;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    // Find user (outside transaction for validation)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if points is being updated
    const currentPoints = user.userProfile?.points ?? 0;
    const pointsDelta = command.points;
    const pointsChanged = pointsDelta !== undefined && pointsDelta !== 0;

    // Validate points adjustment if subtracting
    if (pointsDelta !== undefined && pointsDelta < 0) {
      // If subtracting, check if user has enough points
      const newPoints = currentPoints + pointsDelta;
      if (newPoints < 0) {
        throw new BadRequestException(
          `Insufficient points. Current: ${currentPoints}, attempting to subtract: ${Math.abs(pointsDelta)}`,
        );
      }
    }

    // Check if isActive is being changed to false (user being deactivated)
    const wasActive = user.isActive;
    const willBeInactive = command.isActive === false && wasActive;

    // Execute update in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Update isActive if provided
        if (command.isActive !== undefined) {
          user.isActive = command.isActive;
        }

        // Update points if provided
        if (pointsDelta !== undefined) {
          const newPoints = currentPoints + pointsDelta;

          if (!user.userProfile) {
            // Create user profile if it doesn't exist
            const userProfile = new UserProfile();
            userProfile.userId = user.id;
            userProfile.points = newPoints;
            await entityManager.save(UserProfile, userProfile);
            user.userProfile = userProfile;
          } else {
            user.userProfile.points = newPoints;
            await entityManager.save(UserProfile, user.userProfile);
          }
        }

        // Save user
        const savedUser = await entityManager.save(User, user);

        // Create point transaction if points changed
        if (pointsChanged && pointsDelta !== undefined) {
          const transactionType =
            pointsDelta > 0 ? PointTransactionType.EARN : PointTransactionType.SPEND;

          const newPoints = currentPoints + pointsDelta;
          const pointTransactionRepo = entityManager.getRepository(PointTransaction);
          const pointTransaction = pointTransactionRepo.create({
            userId: command.userId,
            type: transactionType,
            amount: pointsDelta, // Positive for earn, negative for spend
            balanceAfter: newPoints,
            category: 'admin_adjustment',
            referenceType: 'admin_adjustment',
            referenceId: command.adminId,
            description: `Admin adjustment: ${pointsDelta > 0 ? '+' : ''}${pointsDelta} points`,
            metadata: {
              adminId: command.adminId,
              previousPoints: currentPoints,
              pointsDelta: pointsDelta,
              newPoints: newPoints,
            },
          });
          await pointTransactionRepo.save(pointTransaction);

          // Publish point updated event to Redis (after transaction commits)
          // Note: This will be executed after transaction commits successfully
          const eventData = {
            userId: command.userId,
            pointsDelta: pointsDelta,
            previousPoints: currentPoints,
            newPoints: newPoints,
            transactionType: transactionType,
            updatedAt: new Date(),
          };

          // Publish event after transaction (fire and forget)
          setImmediate(() => {
            this.redisService
              .publishEvent(RedisChannel.POINT_UPDATED, eventData)
              .catch((error) => {
                this.logger.error(
                  'Failed to publish point:updated event',
                  {
                    error: error instanceof Error ? error.message : String(error),
                    userId: command.userId,
                  },
                  'user',
                );
              });
          });
        }

        // Revoke all tokens if user is being deactivated
        if (willBeInactive) {
          await entityManager.update(
            UserToken,
            { userId: command.userId, revokedAt: null },
            { revokedAt: new Date() },
          );
        }

        return savedUser;
      },
    );
  }
}
