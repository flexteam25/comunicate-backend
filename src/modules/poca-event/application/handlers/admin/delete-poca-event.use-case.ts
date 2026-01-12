import { Injectable, Inject } from '@nestjs/common';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeletePocaEventCommand {
  eventId: string;
}

@Injectable()
export class DeletePocaEventUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
  ) {}

  async execute(command: DeletePocaEventCommand): Promise<void> {
    const event = await this.pocaEventRepository.findById(command.eventId);

    if (!event) {
      throw notFound(MessageKeys.EVENT_NOT_FOUND);
    }

    await this.pocaEventRepository.softDelete(command.eventId);
  }
}
