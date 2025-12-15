import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';

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
      throw new NotFoundException('Tier not found');
    }

    // Check if tier is already soft deleted
    if (tier.deletedAt) {
      throw new BadRequestException('Tier is already deleted');
    }

    // Check if tier is used by any sites
    const sites = await this.siteRepository.findByTier(command.tierId);
    if (sites.length > 0) {
      throw new BadRequestException(
        `Cannot delete tier. It is used by ${sites.length} site(s)`,
      );
    }

    // Soft delete: set deletedAt timestamp
    await this.tierRepository.delete(command.tierId);
  }
}
