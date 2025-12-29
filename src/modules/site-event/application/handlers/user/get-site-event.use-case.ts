import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { SiteEventView } from '../../../domain/entities/site-event-view.entity';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';

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
      throw new NotFoundException('Event not found');
    }

    // Track view (optional auth - userId may be undefined)
    if (command.ipAddress) {
      // Track view asynchronously without blocking response
      this.transactionService
        .executeInTransaction(async (manager: EntityManager) => {
          const viewRepo = manager.getRepository(SiteEventView);
          const view = viewRepo.create({
            eventId: command.eventId,
            userId: command.userId || null,
            ipAddress: command.ipAddress || null,
          });
          await viewRepo.save(view);
        })
        .catch((error) => {
          // Log but don't throw - view tracking should not block request
          console.error('Failed to track event view:', error);
        });
    }

    return event;
  }
}
