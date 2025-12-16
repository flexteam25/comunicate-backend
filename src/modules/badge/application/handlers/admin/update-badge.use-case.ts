import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface UpdateBadgeCommand {
  badgeId: string;
  name?: string;
  description?: string;
  iconUrl?: string;
  isActive?: boolean;
}

@Injectable()
export class UpdateBadgeUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateBadgeCommand): Promise<Badge> {
    return this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const badgeRepo = manager.getRepository(Badge);

      const badge = await badgeRepo.findOne({
        where: { id: command.badgeId, deletedAt: null },
      });
      if (!badge) {
        throw new NotFoundException('Badge not found');
      }

      // Check if new name conflicts with existing badge
      if (command.name && command.name !== badge.name) {
        const duplicate = await badgeRepo
          .createQueryBuilder('b')
          .where('LOWER(b.name) = LOWER(:name)', { name: command.name })
          .andWhere('b.id != :id', { id: command.badgeId })
          .andWhere('b.deletedAt IS NULL')
          .getOne();
        if (duplicate) {
          throw new BadRequestException('Badge with this name already exists');
        }
      }

      const updateData: Partial<Badge> = {};
      if (command.name !== undefined) updateData.name = command.name;
      if (command.description !== undefined)
        updateData.description = command.description || null;
      if (command.iconUrl !== undefined) updateData.iconUrl = command.iconUrl || null;
      if (command.isActive !== undefined) updateData.isActive = command.isActive;

      await badgeRepo.update(command.badgeId, updateData);
      const updated = await badgeRepo.findOne({
        where: { id: command.badgeId, deletedAt: null },
      });
      if (!updated) {
        throw new NotFoundException('Badge not found after update');
      }
      return updated;
    });
  }
}
