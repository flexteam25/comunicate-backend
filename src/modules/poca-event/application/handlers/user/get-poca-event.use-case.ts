import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { IPocaEventViewRepository } from '../../../infrastructure/persistence/repositories/poca-event-view.repository';

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
    const event = await this.pocaEventRepository.findByIdOrSlugPublic(
      command.idOrSlug,
      ['banners'],
    );

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Track view (best-effort, don't block on errors)
    try {
      await this.pocaEventViewRepository.create({
        eventId: event.id,
        userId: command.userId,
        ipAddress: command.ipAddress,
        userAgent: command.userAgent,
      });

      // Increment view count
      await this.pocaEventRepository.incrementViewCount(event.id);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to track event view:', error);
    }

    return event;
  }
}
