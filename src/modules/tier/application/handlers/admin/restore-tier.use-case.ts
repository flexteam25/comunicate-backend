import { Injectable, Inject } from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.TIER_NOT_FOUND);
    }

    // If not soft-deleted, nothing to restore
    if (!tier.deletedAt) {
      throw badRequest(MessageKeys.TIER_IS_NOT_DELETED);
    }

    // Restore
    await this.tierRepository.restore(command.tierId);
  }
}
