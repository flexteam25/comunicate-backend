import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';

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
      throw new NotFoundException('Event not found');
    }

    await this.pocaEventRepository.softDelete(command.eventId);
  }
}
