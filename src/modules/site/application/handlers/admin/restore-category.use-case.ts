import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RestoreCategoryCommand {
  categoryId: string;
}

@Injectable()
export class RestoreCategoryUseCase {
  constructor(private readonly transactionService: TransactionService) {}

  async execute(command: RestoreCategoryCommand): Promise<void> {
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const categoryRepo = manager.getRepository(SiteCategory);

      const category = await categoryRepo.findOne({
        where: { id: command.categoryId },
        withDeleted: true,
      });
      if (!category) {
        throw notFound(MessageKeys.CATEGORY_NOT_FOUND);
      }

      if (!category.deletedAt) {
        throw badRequest(MessageKeys.CATEGORY_NOT_DELETED);
      }

      await categoryRepo.restore(command.categoryId);
    });
  }
}
