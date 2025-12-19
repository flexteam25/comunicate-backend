import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { SiteCategory } from '../../../domain/entities/site-category.entity';

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
        throw new NotFoundException('Category not found');
      }

      if (!category.deletedAt) {
        throw new BadRequestException('Category is not deleted');
      }

      await categoryRepo.restore(command.categoryId);
    });
  }
}
