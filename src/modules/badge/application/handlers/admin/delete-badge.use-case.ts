import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { Badge } from '../../../domain/entities/badge.entity';
import { UserBadge } from '../../../../user/domain/entities/user-badge.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteBadgeCommand {
  badgeId: string;
}

@Injectable()
export class DeleteBadgeUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: DeleteBadgeCommand): Promise<void> {
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const badgeRepo = manager.getRepository(Badge);
      const userBadgeRepo = manager.getRepository(UserBadge);

      // Find badge including soft-deleted
      const badge = await badgeRepo.findOne({
        where: { id: command.badgeId },
        withDeleted: true,
      });
      if (!badge) {
        throw notFound(MessageKeys.BADGE_NOT_FOUND);
      }

      // Check if already soft deleted
      if (badge.deletedAt) {
        throw badRequest(MessageKeys.BADGE_ALREADY_DELETED);
      }

      // Check if badge is assigned to any users
      const usedCount = await userBadgeRepo.count({
        where: { badgeId: command.badgeId },
      });
      if (usedCount > 0) {
        throw badRequest(MessageKeys.CANNOT_DELETE_BADGE_ASSIGNED_TO_USERS, {
          userCount: usedCount,
        });
      }

      // Soft delete
      await badgeRepo.softDelete(command.badgeId);
    });
  }
}
