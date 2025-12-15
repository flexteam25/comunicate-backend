import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import { Tier } from '../../../domain/entities/tier.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface UpdateTierCommand {
  tierId: string;
  name?: string;
  description?: string;
  order?: number;
  color?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateTierUseCase {
  constructor(
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateTierCommand): Promise<Tier> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const tierRepo = manager.getRepository(Tier);

        const tier = await tierRepo.findOne({
          where: { id: command.tierId, deletedAt: null },
        });
        if (!tier) {
          throw new NotFoundException('Tier not found');
        }

        // Check if new name conflicts with existing tier
        if (command.name && command.name !== tier.name) {
          const duplicate = await tierRepo
            .createQueryBuilder('t')
            .where('LOWER(t.name) = LOWER(:name)', { name: command.name })
            .andWhere('t.id != :id', { id: command.tierId })
            .andWhere('t.deletedAt IS NULL')
            .getOne();
          if (duplicate) {
            throw new BadRequestException('Tier with this name already exists');
          }
        }

        const updateData: Partial<Tier> = {};
        if (command.name !== undefined) updateData.name = command.name;
        if (command.description !== undefined)
          updateData.description = command.description || null;
        if (command.order !== undefined) updateData.order = command.order;
        if (command.color !== undefined) updateData.color = command.color || null;
        if (command.isActive !== undefined) updateData.isActive = command.isActive;

        await tierRepo.update(command.tierId, updateData);
        const updated = await tierRepo.findOne({
          where: { id: command.tierId, deletedAt: null },
        });
        if (!updated) {
          throw new NotFoundException('Tier not found after update');
        }
        return updated;
      },
    );
  }
}

