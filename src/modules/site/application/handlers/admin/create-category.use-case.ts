import { Injectable } from '@nestjs/common';
import { SiteCategory } from '../../../domain/entities/site-category.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { badRequest, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface CreateCategoryCommand {
  name: string;
  nameKo?: string;
  description?: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly transactionService: TransactionService) {}

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
          throw badRequest(MessageKeys.CATEGORY_NAME_ALREADY_EXISTS);
        }

        const category = categoryRepo.create({
          name: command.name,
          nameKo: command.nameKo,
          description: command.description,
        });
        return categoryRepo.save(category);
      },
    );
  }
}
