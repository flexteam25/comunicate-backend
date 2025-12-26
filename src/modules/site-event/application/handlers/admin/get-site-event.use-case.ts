import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { SiteEvent } from '../../../domain/entities/site-event.entity';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';

export interface GetSiteEventCommand {
  eventId: string;
}

@Injectable()
export class GetSiteEventUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
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

    return event;
  }
}

