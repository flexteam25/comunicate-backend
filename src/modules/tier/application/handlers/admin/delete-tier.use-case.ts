import { Injectable, Inject } from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteTierCommand {
  tierId: string;
}

@Injectable()
export class DeleteTierUseCase {
  constructor(
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: DeleteTierCommand): Promise<void> {
    // Find tier including inactive ones
    const tier = await this.tierRepository.findByIdIncludingDeleted(command.tierId);
    if (!tier) {
      throw notFound(MessageKeys.TIER_NOT_FOUND);
    }

    // Check if tier is already soft deleted
    if (tier.deletedAt) {
      throw badRequest(MessageKeys.TIER_IS_ALREADY_DELETED);
    }

    // Check if tier is used by any sites
    const sites = await this.siteRepository.findByTier(command.tierId);
    if (sites.length > 0) {
      throw badRequest(MessageKeys.CANNOT_DELETE_TIER_IN_USE, {
        siteCount: sites.length,
      });
    }

    // Soft delete: set deletedAt timestamp
    await this.tierRepository.delete(command.tierId);
  }
}
