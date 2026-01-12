import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { SiteEventView } from '../../../domain/entities/site-event-view.entity';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetSiteEventCommand {
  eventId: string;
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class GetSiteEventUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: GetSiteEventCommand): Promise<SiteEvent> {
    const event = await this.siteEventRepository.findById(command.eventId, [
      'site',
      'user',
      'admin',
      'banners',
    ]);

    if (!event) {
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    // Track view only for authenticated users (async, don't block on errors)
    if (command.userId && command.ipAddress) {
      this.transactionService
        .executeInTransaction(async (manager: EntityManager) => {
          const viewRepo = manager.getRepository(SiteEventView);

          // Check if view already exists for this user and event
          const existing = await viewRepo.findOne({
            where: {
              eventId: command.eventId,
              userId: command.userId,
            },
          });

          if (!existing) {
            const view = viewRepo.create({
              eventId: command.eventId,
              userId: command.userId,
              ipAddress: command.ipAddress,
            });
            await viewRepo.save(view);
          }
        })
        .catch((error) => {
          // Log but don't throw - view tracking should not block request
          console.error('Failed to track event view:', error);
        });
    }

    return event;
  }
}
