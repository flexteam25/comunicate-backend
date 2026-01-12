import { Injectable, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    return event;
  }
}
