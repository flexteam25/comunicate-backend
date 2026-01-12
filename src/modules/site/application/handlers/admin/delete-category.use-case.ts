import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { Site } from '../../../domain/entities/site.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteCategoryCommand {
  categoryId: string;
}

@Injectable()
export class DeleteCategoryUseCase {
  constructor(private readonly transactionService: TransactionService) {}

  async execute(command: DeleteCategoryCommand): Promise<void> {
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const categoryRepo = manager.getRepository(SiteCategory);
      const siteRepo = manager.getRepository(Site);

      // Find category including soft-deleted
      const category = await categoryRepo.findOne({
        where: { id: command.categoryId },
        withDeleted: true,
      });
      if (!category) {
        throw notFound(MessageKeys.CATEGORY_NOT_FOUND);
      }

      // Check if already soft deleted
      if (category.deletedAt) {
        throw badRequest(MessageKeys.CATEGORY_IS_ALREADY_DELETED);
      }

      // Check if category is used by any sites
      const usedCount = await siteRepo.count({
        where: { categoryId: command.categoryId, deletedAt: null },
      });
      if (usedCount > 0) {
        throw badRequest(MessageKeys.CANNOT_DELETE_CATEGORY_IN_USE, {
          siteCount: usedCount,
        });
      }

      // Soft delete
      await categoryRepo.softDelete(command.categoryId);
    });
  }
}
