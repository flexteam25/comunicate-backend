import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';

export interface RestoreTierCommand {
  tierId: string;
}

@Injectable()
export class RestoreTierUseCase {
  constructor(
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
  ) {}

  async execute(command: RestoreTierCommand): Promise<void> {
    const tier = await this.tierRepository.findByIdIncludingDeleted(command.tierId);
    if (!tier) {
      throw new NotFoundException('Tier not found');
    }

    // If not soft-deleted, nothing to restore
    if (!tier.deletedAt) {
      throw new BadRequestException('Tier is not deleted');
    }

    // Restore
    await this.tierRepository.restore(command.tierId);
  }
}
