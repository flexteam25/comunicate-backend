import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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
          throw new NotFoundException('Partner request not found');
        }

        // Check status is pending
        if (request.status !== PartnerRequestStatus.PENDING) {
          throw new BadRequestException('Request has already been processed');
        }

        // Find partner role
        const partnerRole = await roleRepo.findOne({
          where: { name: 'partner', deletedAt: null },
        });

        if (!partnerRole) {
          throw new NotFoundException('Partner role not found');
        }

        // Check if user already has partner role
        const existingUserRole = await userRoleRepo.findOne({
          where: {
            userId: request.userId,
            roleId: partnerRole.id,
          },
        });

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
          throw new Error('Failed to reload partner request after approval');
        }

        return reloaded;
      },
    );
  }
}
