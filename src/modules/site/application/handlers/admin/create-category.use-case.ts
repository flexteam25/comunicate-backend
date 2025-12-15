import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateCategoryCommand {
  name: string;
  description?: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject('ISiteCategoryRepository')
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateCategoryCommand): Promise<SiteCategory> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const categoryRepo = manager.getRepository(SiteCategory);

        // Check duplicate by name (case-insensitive), excluding soft-deleted
        const duplicate = await categoryRepo
          .createQueryBuilder('c')
          .where('LOWER(c.name) = LOWER(:name)', { name: command.name })
          .andWhere('c.deletedAt IS NULL')
          .getOne();
        if (duplicate) {
          throw new BadRequestException('Category with this name already exists');
        }

        const category = categoryRepo.create({
          name: command.name,
          description: command.description,
        });
        return categoryRepo.save(category);
      },
    );
  }
}
