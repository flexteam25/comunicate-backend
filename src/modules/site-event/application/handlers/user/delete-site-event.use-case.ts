import { Injectable, Inject } from '@nestjs/common';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteSiteEventCommand {
  userId: string;
  eventId: string;
}

@Injectable()
export class DeleteSiteEventUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
  ) {}

  async execute(command: DeleteSiteEventCommand): Promise<void> {
    // Get existing event
    const event = await this.siteEventRepository.findById(command.eventId, ['site']);

    if (!event) {
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      event.siteId,
      command.userId,
    );

    if (!manager) {
      throw forbidden(MessageKeys.NO_PERMISSION_TO_DELETE_EVENTS);
    }

    // Soft delete the event
    await this.siteEventRepository.delete(command.eventId);
  }
}
