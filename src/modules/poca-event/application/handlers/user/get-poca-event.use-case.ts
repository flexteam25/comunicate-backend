import { Injectable, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { IPocaEventViewRepository } from '../../../infrastructure/persistence/repositories/poca-event-view.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetPocaEventCommand {
  idOrSlug: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class GetPocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
    @Inject('IPocaEventViewRepository')
    private readonly pocaEventViewRepository: IPocaEventViewRepository,
  ) {}

  async execute(command: GetPocaEventCommand): Promise<PocaEvent> {
    const event = await this.pocaEventRepository.findByIdOrSlugPublic(command.idOrSlug, [
      'banners',
    ]);

    if (!event) {
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    // Track view only for authenticated users (best-effort, don't block on errors)
    if (command.userId) {
      try {
        await this.pocaEventViewRepository.create({
          eventId: event.id,
          userId: command.userId,
          ipAddress: command.ipAddress,
          userAgent: command.userAgent,
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to track event view:', error);
      }
    }

    return event;
  }
}
