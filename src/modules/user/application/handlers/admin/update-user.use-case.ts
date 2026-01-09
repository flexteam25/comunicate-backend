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
import { UserRole } from '../../../domain/entities/user-role.entity';
import { Role } from '../../../domain/entities/role.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';

export interface UpdateUserCommand {
  userId: string;
  adminId: string;
  isActive?: boolean;
  points?: number; // Absolute value (>= 0), not delta
  partner?: boolean;
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
    const newPoints = command.points;
    const pointsChanged =
      newPoints !== undefined && newPoints !== currentPoints;

    // Calculate diff if points are being updated
    const pointsDelta =
      newPoints !== undefined ? newPoints - currentPoints : undefined;

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
        if (newPoints !== undefined) {
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

        // Create point transaction if points changed (diff !== 0)
        if (pointsChanged && pointsDelta !== undefined && pointsDelta !== 0) {
          const transactionType =
            pointsDelta > 0 ? PointTransactionType.EARN : PointTransactionType.SPEND;

          const pointTransactionRepo = entityManager.getRepository(PointTransaction);
          const pointTransaction = pointTransactionRepo.create({
            userId: command.userId,
            type: transactionType,
            amount: pointsDelta, // Positive for earn, negative for spend
            balanceAfter: newPoints!,
            category: 'admin_adjustment',
            referenceType: 'admin_adjustment',
            referenceId: command.adminId,
            description: `Admin adjustment: ${pointsDelta > 0 ? '+' : ''}${pointsDelta} points`,
            metadata: {
              adminId: command.adminId,
              previousPoints: currentPoints,
              pointsDelta: pointsDelta,
              newPoints: newPoints!,
            },
          });
          await pointTransactionRepo.save(pointTransaction);

          // Publish point updated event to Redis (after transaction commits)
          // Note: This will be executed after transaction commits successfully
          const eventData = {
            userId: command.userId,
            pointsDelta: pointsDelta,
            previousPoints: currentPoints,
            newPoints: newPoints!,
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

        // Handle partner role update
        // User can only have 1 role: either "user" or "partner"
        if (command.partner !== undefined) {
          const roleRepo = entityManager.getRepository(Role);
          const userRoleRepo = entityManager.getRepository(UserRole);

          // Find target role based on partner value
          const targetRoleName = command.partner === true ? 'partner' : 'user';
          const targetRole = await roleRepo.findOne({
            where: { name: targetRoleName, deletedAt: null },
          });

          if (!targetRole) {
            throw new NotFoundException(`${targetRoleName} role not found`);
          }

          // Get current user roles to determine previous role
          const currentUserRoles = await userRoleRepo.find({
            where: { userId: command.userId },
            relations: ['role'],
          });

          // Get previous role name (if exists)
          const previousRole =
            currentUserRoles.length > 0 && currentUserRoles[0].role
              ? currentUserRoles[0].role.name
              : null;

          // Check if role actually changed
          const roleChanged = previousRole !== targetRoleName;

          // Always ensure user has exactly 1 role (target role)
          if (currentUserRoles.length === 0) {
            // No role exists, create target role
            const newUserRole = userRoleRepo.create({
              userId: command.userId,
              roleId: targetRole.id,
            });
            await userRoleRepo.save(newUserRole);
          } else if (currentUserRoles.length === 1) {
            // User has 1 role, update to target role
            const existingUserRole = currentUserRoles[0];
            if (existingUserRole.roleId !== targetRole.id) {
              await userRoleRepo
                .createQueryBuilder()
                .update(UserRole)
                .set({ roleId: targetRole.id })
                .where('id = :id', { id: existingUserRole.id })
                .execute();
            }
          } else {
            // User has multiple roles (should not happen, but handle it)
            // Delete all and create target role
            await userRoleRepo.delete({ userId: command.userId });
            const newUserRole = userRoleRepo.create({
              userId: command.userId,
              roleId: targetRole.id,
            });
            await userRoleRepo.save(newUserRole);
          }

          // Publish role updated event only if role actually changed
          if (roleChanged) {
            const eventData = {
              userId: command.userId,
              previousRole: previousRole,
              newRole: targetRoleName,
              isPartner: command.partner,
              updatedAt: new Date(),
            };

            // Publish event after transaction (fire and forget)
            setImmediate(() => {
              this.redisService
                .publishEvent(RedisChannel.ROLE_UPDATED as string, eventData)
                .catch((error) => {
                  this.logger.error(
                    'Failed to publish role:updated event',
                    {
                      error: error instanceof Error ? error.message : String(error),
                      userId: command.userId,
                    },
                    'user',
                  );
                });
            });
          }
        }

        return savedUser;
      },
    );
  }
}
