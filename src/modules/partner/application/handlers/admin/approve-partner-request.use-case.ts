import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IPartnerRequestRepository } from '../../../infrastructure/persistence/repositories/partner-request.repository';
import {
  PartnerRequest,
  PartnerRequestStatus,
} from '../../../domain/entities/partner-request.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { User } from '../../../../user/domain/entities/user.entity';
import { UserRole } from '../../../../user/domain/entities/user-role.entity';
import { Role } from '../../../../user/domain/entities/role.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface ApprovePartnerRequestCommand {
  requestId: string;
  adminId: string;
}

@Injectable()
export class ApprovePartnerRequestUseCase {
  constructor(
    @Inject('IPartnerRequestRepository')
    private readonly partnerRequestRepository: IPartnerRequestRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: ApprovePartnerRequestCommand): Promise<PartnerRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(PartnerRequest);
        const userRepo = manager.getRepository(User);
        const userRoleRepo = manager.getRepository(UserRole);
        const roleRepo = manager.getRepository(Role);

        // Lock request row with pessimistic lock
        const request = await requestRepo
          .createQueryBuilder('request')
          .where('request.id = :id', { id: command.requestId })
          .andWhere('request.deletedAt IS NULL')
          .setLock('pessimistic_write')
          .getOne();

        if (!request) {
          throw notFound(MessageKeys.PARTNER_REQUEST_NOT_FOUND);
        }

        // Check status is pending
        if (request.status !== PartnerRequestStatus.PENDING) {
          throw badRequest(MessageKeys.PARTNER_REQUEST_ALREADY_PROCESSED);
        }

        // Find partner role
        const partnerRole = await roleRepo.findOne({
          where: { name: 'partner', deletedAt: null },
        });

        if (!partnerRole) {
          throw notFound(MessageKeys.PARTNER_ROLE_NOT_FOUND);
        }

        // Get all current user roles to determine previous role
        const allUserRoles = await userRoleRepo.find({
          where: { userId: request.userId },
          relations: ['role'],
        });

        // Get previous role name
        const previousRole =
          allUserRoles.length > 0 && allUserRoles[0].role
            ? allUserRoles[0].role.name
            : null;

        // Check if user already has partner role
        const existingUserRole = allUserRoles.find((ur) => ur.roleId === partnerRole.id);

        const roleChanged = previousRole !== 'partner';

        if (!existingUserRole) {
          // Add partner role to user
          const userRole = userRoleRepo.create({
            userId: request.userId,
            roleId: partnerRole.id,
          });
          await userRoleRepo.save(userRole);
        }

        // Update request status
        request.status = PartnerRequestStatus.APPROVED;
        request.adminId = command.adminId;
        request.reviewedAt = new Date();
        await requestRepo.save(request);

        // Reload with relations
        const reloaded = await requestRepo.findOne({
          where: { id: request.id },
          relations: ['user', 'admin'],
        });

        if (!reloaded) {
          throw notFound(MessageKeys.PARTNER_REQUEST_NOT_FOUND_AFTER_APPROVAL);
        }

        // Publish role updated event to Redis (after transaction commits)
        if (roleChanged) {
          const eventData = {
            userId: request.userId,
            previousRole: previousRole,
            newRole: 'partner',
            isPartner: true,
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
                    userId: request.userId,
                    requestId: command.requestId,
                  },
                  'partner',
                );
              });
          });
        }

        return reloaded;
      },
    );
  }
}
