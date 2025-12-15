import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { Site } from '../../../domain/entities/site.entity';

export interface DeleteCategoryCommand {
  categoryId: string;
}

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject('ISiteCategoryRepository')
    @Inject('ISiteRepository')
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const categoryRepo = manager.getRepository(SiteCategory);
        const siteRepo = manager.getRepository(Site);

        // Find category including soft-deleted
        const category = await categoryRepo.findOne({
          where: { id: command.categoryId },
          withDeleted: true,
        });
        if (!category) {
          throw new NotFoundException("Category not found");
        }

        // Check if already soft deleted
        if (category.deletedAt) {
          throw new BadRequestException("Category is already deleted");
        }

        // Check if category is used by any sites
        const usedCount = await siteRepo.count({
          where: { categoryId: command.categoryId, deletedAt: null },
        });
        if (usedCount > 0) {
          throw new BadRequestException(
            `Cannot delete category. It is used by ${usedCount} site(s)`
          );
        }

        // Soft delete
        await categoryRepo.softDelete(command.categoryId);
      }
    );
  }
}
