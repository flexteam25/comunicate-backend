import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface UpdateCategoryCommand {
  categoryId: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly transactionService: TransactionService) {}

  async execute(command: UpdateCategoryCommand): Promise<SiteCategory> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const categoryRepo = manager.getRepository(SiteCategory);

        const category = await categoryRepo.findOne({
          where: { id: command.categoryId, deletedAt: null },
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }

        // Check if new name conflicts with existing category
        if (command.name && command.name !== category.name) {
          const duplicate = await categoryRepo
            .createQueryBuilder('c')
            .where('LOWER(c.name) = LOWER(:name)', { name: command.name })
            .andWhere('c.id != :id', { id: command.categoryId })
            .andWhere('c.deletedAt IS NULL')
            .getOne();
          if (duplicate) {
            throw new BadRequestException('Category with this name already exists');
          }
        }

        const updateData: Partial<SiteCategory> = {};
        if (command.name !== undefined) updateData.name = command.name;
        if (command.description !== undefined)
          updateData.description = command.description || null;
        if (command.isActive !== undefined) updateData.isActive = command.isActive;

        await categoryRepo.update(command.categoryId, updateData);
        const updated = await categoryRepo.findOne({
          where: { id: command.categoryId, deletedAt: null },
        });
        if (!updated) {
          throw new NotFoundException('Category not found after update');
        }
        return updated;
      },
    );
  }
}
