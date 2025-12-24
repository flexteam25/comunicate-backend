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

export interface RejectPartnerRequestCommand {
  requestId: string;
  adminId: string;
  rejectionReason?: string;
}

@Injectable()
export class RejectPartnerRequestUseCase {
  constructor(
    @Inject('IPartnerRequestRepository')
    private readonly partnerRequestRepository: IPartnerRequestRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RejectPartnerRequestCommand): Promise<PartnerRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(PartnerRequest);

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

        // Update request status
        request.status = PartnerRequestStatus.REJECTED;
        request.adminId = command.adminId;
        request.reviewedAt = new Date();
        if (command.rejectionReason) {
          request.rejectionReason = command.rejectionReason;
        }
        await requestRepo.save(request);

        // Reload with relations
        const reloaded = await requestRepo.findOne({
          where: { id: request.id },
          relations: ['user', 'admin'],
        });

        if (!reloaded) {
          throw new Error('Failed to reload partner request after rejection');
        }

        return reloaded;
      },
    );
  }
}
