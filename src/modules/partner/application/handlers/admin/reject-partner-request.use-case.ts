import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IPartnerRequestRepository } from '../../../infrastructure/persistence/repositories/partner-request.repository';
import {
  PartnerRequest,
  PartnerRequestStatus,
} from '../../../domain/entities/partner-request.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

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
          throw notFound(MessageKeys.PARTNER_REQUEST_NOT_FOUND);
        }

        // Check status is pending
        if (request.status !== PartnerRequestStatus.PENDING) {
          throw badRequest(MessageKeys.PARTNER_REQUEST_ALREADY_PROCESSED);
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
          throw notFound(MessageKeys.PARTNER_REQUEST_NOT_FOUND_AFTER_REJECTION);
        }

        return reloaded;
      },
    );
  }
}
