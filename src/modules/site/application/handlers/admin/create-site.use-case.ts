import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteCategoryRepository } from '../../../infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateSiteCommand {
  name: string;
  categoryId: string;
  logoUrl?: string;
  mainImageUrl?: string;
  tierId?: string;
  permanentUrl?: string;
  description?: string;
}
@Injectable()
export class CreateSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateSiteCommand): Promise<Site> {
    // Validate category exists
    const category = await this.siteCategoryRepository.findById(command.categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }

    // Validate tier exists if provided
    if (command.tierId) {
      const tier = await this.tierRepository.findById(command.tierId);
      if (!tier) {
        throw new BadRequestException('Tier not found');
      }
    }

    // Create site within transaction
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const siteRepo = manager.getRepository(Site);

        const site = siteRepo.create({
          name: command.name,
          categoryId: command.categoryId,
          logoUrl: command.logoUrl,
          mainImageUrl: command.mainImageUrl,
          tierId: command.tierId,
          permanentUrl: command.permanentUrl,
          description: command.description,
          status: SiteStatus.UNVERIFIED,
          reviewCount: 0,
          averageRating: 0,
        });

        return siteRepo.save(site);
      },
    );
  }
}
