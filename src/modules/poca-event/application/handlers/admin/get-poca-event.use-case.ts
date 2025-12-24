import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';

export interface AdminGetPocaEventCommand {
  eventId: string;
}

@Injectable()
export class AdminGetPocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
  ) {}

  async execute(command: AdminGetPocaEventCommand): Promise<PocaEvent> {
    const event = await this.pocaEventRepository.findById(command.eventId, ['banners']);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }
}
