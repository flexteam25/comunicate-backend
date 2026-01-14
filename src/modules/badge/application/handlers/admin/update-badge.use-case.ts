import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdateBadgeCommand {
  badgeId: string;
  name?: string;
  description?: string;
  iconUrl?: string;
  iconName?: string;
  isActive?: boolean;
  obtain?: string;
  point?: number;
  color?: string;
  order?: number;
}

@Injectable()
export class UpdateBadgeUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateBadgeCommand): Promise<Badge> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const badgeRepo = manager.getRepository(Badge);

        const badge = await badgeRepo.findOne({
          where: { id: command.badgeId, deletedAt: null },
        });
        if (!badge) {
          throw notFound(MessageKeys.BADGE_NOT_FOUND);
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
            throw badRequest(MessageKeys.BADGE_NAME_ALREADY_EXISTS);
          }
        }

        const updateData: Partial<Badge> = {};
        if (command.name !== undefined) updateData.name = command.name;
        if (command.description !== undefined)
          updateData.description = command.description || null;
        if (command.iconUrl !== undefined) updateData.iconUrl = command.iconUrl || null;
        if (command.iconName !== undefined)
          updateData.iconName = command.iconName || null;
        if (command.isActive !== undefined) updateData.isActive = command.isActive;
        if (command.obtain !== undefined) updateData.obtain = command.obtain || null;
        if (command.point !== undefined) {
          updateData.point = badge.badgeType === 'user' ? command.point : 0;
        }
        if (command.color !== undefined) updateData.color = command.color || null;
        if (command.order !== undefined) updateData.order = command.order;

        await badgeRepo.update(command.badgeId, updateData);
        const updated = await badgeRepo.findOne({
          where: { id: command.badgeId, deletedAt: null },
        });
        if (!updated) {
          throw notFound(MessageKeys.BADGE_NOT_FOUND_AFTER_UPDATE);
        }
        return updated;
      },
    );
  }
}
