import { Injectable, BadRequestException, Inject } from '@nestjs/common';
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

export interface CreatePartnerRequestCommand {
  userId: string;
}

@Injectable()
export class CreatePartnerRequestUseCase {
  constructor(
    @Inject('IPartnerRequestRepository')
    private readonly partnerRequestRepository: IPartnerRequestRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreatePartnerRequestCommand): Promise<PartnerRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(PartnerRequest);
        const userRepo = manager.getRepository(User);
        const userRoleRepo = manager.getRepository(UserRole);
        const roleRepo = manager.getRepository(Role);

        // Check if user exists
        const user = await userRepo.findOne({
          where: { id: command.userId, deletedAt: null },
        });

        if (!user) {
          throw new BadRequestException('User not found');
        }

        // Check if user already has partner role
        const partnerRole = await roleRepo.findOne({
          where: { name: 'partner', deletedAt: null },
        });

        if (partnerRole) {
          const existingUserRole = await userRoleRepo.findOne({
            where: {
              userId: command.userId,
              roleId: partnerRole.id,
            },
          });

          if (existingUserRole) {
            throw new BadRequestException('User already has partner role');
          }
        }

        // Check if user already has a partner request
        const existingRequest = await requestRepo.findOne({
          where: { userId: command.userId, deletedAt: null },
          order: { createdAt: 'DESC' },
        });

        if (existingRequest) {
          // If request is PENDING, throw error
          if (existingRequest.status === PartnerRequestStatus.PENDING) {
            throw new BadRequestException('You already have a pending partner request');
          }

          // If request is APPROVED, user already has partner role (checked above)
          // This should not happen, but handle it anyway
          if (existingRequest.status === PartnerRequestStatus.APPROVED) {
            throw new BadRequestException('You already have an approved partner request');
          }

          // If request is REJECTED, update it to PENDING (reset for new request)
          if (existingRequest.status === PartnerRequestStatus.REJECTED) {
            existingRequest.status = PartnerRequestStatus.PENDING;
            existingRequest.adminId = null;
            existingRequest.reviewedAt = null;
            existingRequest.rejectionReason = null;
            const updated = await requestRepo.save(existingRequest);

            // Reload with relations
            const reloaded = await requestRepo.findOne({
              where: { id: updated.id },
              relations: ['user', 'admin'],
            });

            if (!reloaded) {
              throw new Error('Failed to reload partner request after update');
            }

            return reloaded;
          }
        }

        // Create new partner request
        const partnerRequest = requestRepo.create({
          userId: command.userId,
          status: PartnerRequestStatus.PENDING,
        });

        const saved = await requestRepo.save(partnerRequest);

        // Reload with relations
        const reloaded = await requestRepo.findOne({
          where: { id: saved.id },
          relations: ['user', 'admin'],
        });

        if (!reloaded) {
          throw new Error('Failed to reload partner request after creation');
        }

        return reloaded;
      },
    );
  }
}
