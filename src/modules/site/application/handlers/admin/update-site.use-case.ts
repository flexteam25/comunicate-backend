import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ISiteRepository } from '../../../infrastructure/persistence/repositories/site.repository';
import { ISiteCategoryRepository } from '../../../infrastructure/persistence/repositories/site-category.repository';
import { ITierRepository } from '../../../../tier/infrastructure/persistence/repositories/tier.repository';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface UpdateSiteCommand {
  siteId: string;
  name?: string;
  categoryId?: string;
  logoUrl?: string;
  mainImageUrl?: string;
  tierId?: string;
  permanentUrl?: string;
  status?: SiteStatus;
  description?: string;
}

@Injectable()
export class UpdateSiteUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('ISiteCategoryRepository')
    private readonly siteCategoryRepository: ISiteCategoryRepository,
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateSiteCommand): Promise<Site> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const siteRepo = manager.getRepository(Site);

        // Check if site exists
        const site = await siteRepo.findOne({
          where: { id: command.siteId, deletedAt: null },
        });
        if (!site) {
          throw new NotFoundException('Site not found');
        }

        // Validate category if provided
        if (command.categoryId) {
          const category = await this.siteCategoryRepository.findById(command.categoryId);
          if (!category) {
            throw new BadRequestException('Category not found');
          }
        }

        // Validate tier if provided
        if (command.tierId !== undefined && command.tierId) {
          const tier = await this.tierRepository.findById(command.tierId);
          if (!tier) {
            throw new BadRequestException('Tier not found');
          }
        }

        // Build update data
        const updateData: Partial<Site> = {};
        if (command.name !== undefined) updateData.name = command.name;
        if (command.categoryId !== undefined) updateData.categoryId = command.categoryId;
        if (command.logoUrl !== undefined) updateData.logoUrl = command.logoUrl || null;
        if (command.mainImageUrl !== undefined)
          updateData.mainImageUrl = command.mainImageUrl || null;
        if (command.tierId !== undefined) updateData.tierId = command.tierId || null;
        if (command.permanentUrl !== undefined)
          updateData.permanentUrl = command.permanentUrl || null;
        if (command.status !== undefined) updateData.status = command.status;
        if (command.description !== undefined)
          updateData.description = command.description || null;

        await siteRepo.update(command.siteId, updateData);
        const updated = await siteRepo.findOne({
          where: { id: command.siteId, deletedAt: null },
        });
        if (!updated) {
          throw new NotFoundException('Site not found after update');
        }
        return updated;
      },
    );
  }
}
