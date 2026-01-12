import { Injectable, Inject } from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import { Tier } from '../../../domain/entities/tier.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CreateTierCommand {
  name: string;
  description?: string;
  order?: number;
  color?: string;
}

@Injectable()
export class CreateTierUseCase {
  constructor(
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateTierCommand): Promise<Tier> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const tierRepo = manager.getRepository(Tier);

        const duplicate = await tierRepo
          .createQueryBuilder('t')
          .where('LOWER(t.name) = LOWER(:name)', { name: command.name })
          .andWhere('t.deletedAt IS NULL')
          .getOne();
        if (duplicate) {
          throw badRequest(MessageKeys.TIER_NAME_ALREADY_EXISTS);
        }

        const tier = tierRepo.create({
          name: command.name,
          description: command.description,
          order: command.order ?? 0,
          color: command.color,
        });
        return tierRepo.save(tier);
      },
    );
  }
}
