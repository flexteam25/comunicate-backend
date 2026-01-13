import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RejectBadgeRequestCommand {
  requestId: string;
  adminId: string;
  note?: string;
}

@Injectable()
export class RejectBadgeRequestUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RejectBadgeRequestCommand): Promise<SiteBadgeRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(SiteBadgeRequest);

        // Lock request row with pessimistic lock
        const request = await requestRepo
          .createQueryBuilder('request')
          .where('request.id = :id', { id: command.requestId })
          .setLock('pessimistic_write')
          .getOne();

        if (!request) {
          throw notFound(MessageKeys.SITE_BADGE_REQUEST_NOT_FOUND);
        }

        // Check status is pending
        if (request.status !== SiteBadgeRequestStatus.PENDING) {
          throw badRequest(MessageKeys.BADGE_REQUEST_ALREADY_PROCESSED);
        }

        // Update request
        request.status = SiteBadgeRequestStatus.REJECTED;
        request.adminId = command.adminId;
        request.note = command.note || null;
        await requestRepo.save(request);

        // Reload with relations
        const reloaded = await requestRepo.findOne({
          where: { id: request.id },
          relations: ['site', 'badge', 'user', 'admin'],
        });

        if (!reloaded) {
          throw notFound(MessageKeys.SITE_BADGE_REQUEST_NOT_FOUND_AFTER_UPDATE);
        }

        return reloaded;
      },
    );
  }
}
