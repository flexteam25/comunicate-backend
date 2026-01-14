import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteBadgeRequest, SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';
import { SiteBadge } from '../../../domain/entities/site-badge.entity';
import { ISiteBadgeRequestRepository } from '../../../infrastructure/persistence/repositories/site-badge-request.repository';
import { ISiteBadgeRepository } from '../../../infrastructure/persistence/repositories/site-badge.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface ApproveBadgeRequestCommand {
  requestId: string;
  adminId: string;
  note?: string;
}

@Injectable()
export class ApproveBadgeRequestUseCase {
  constructor(
    @Inject('ISiteBadgeRequestRepository')
    private readonly badgeRequestRepository: ISiteBadgeRequestRepository,
    @Inject('ISiteBadgeRepository')
    private readonly siteBadgeRepository: ISiteBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ApproveBadgeRequestCommand): Promise<SiteBadgeRequest> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const requestRepo = manager.getRepository(SiteBadgeRequest);
        const siteBadgeRepo = manager.getRepository(SiteBadge);

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

        // Double-check site doesn't already have this badge (handle race condition)
        const existingBadge = await siteBadgeRepo.findOne({
          where: {
            siteId: request.siteId,
            badgeId: request.badgeId,
          },
        });

        if (existingBadge) {
          throw badRequest(MessageKeys.BADGE_ALREADY_ASSIGNED_TO_SITE);
        }

        // Update request
        request.status = SiteBadgeRequestStatus.APPROVED;
        request.adminId = command.adminId;
        request.note = command.note || null;
        await requestRepo.save(request);

        // Assign badge to site
        const siteBadge = siteBadgeRepo.create({
          siteId: request.siteId,
          badgeId: request.badgeId,
        });
        await siteBadgeRepo.save(siteBadge);

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
