import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UserBadgeRequest, UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';
import { IUserBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/user-badge-request.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RejectUserBadgeRequestCommand {
  requestId: string;
  adminId: string;
  note?: string;
}

@Injectable()
export class RejectUserBadgeRequestUseCase {
  constructor(
    @Inject('IUserBadgeRequestRepository')
    private readonly badgeRequestRepository: IUserBadgeRequestRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RejectUserBadgeRequestCommand): Promise<UserBadgeRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(UserBadgeRequest);

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

        // Update request
        request.status = UserBadgeRequestStatus.REJECTED;
        request.adminId = command.adminId;
        request.note = command.note || null;
        await requestRepo.save(request);

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
