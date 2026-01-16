import { Injectable, Inject } from '@nestjs/common';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteSiteEventCommand {
  eventId: string;
}

@Injectable()
export class DeleteSiteEventUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
  ) {}

  async execute(command: DeleteSiteEventCommand): Promise<void> {
    const event = await this.siteEventRepository.findById(command.eventId);

    if (!event) {
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    await this.siteEventRepository.delete(command.eventId);
  }
}
