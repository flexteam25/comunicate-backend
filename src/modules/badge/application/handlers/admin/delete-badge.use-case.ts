import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { Badge } from '../../../domain/entities/badge.entity';
import { UserBadge } from '../../../../user/domain/entities/user-badge.entity';

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
        throw new NotFoundException('Badge not found');
      }

      // Check if already soft deleted
      if (badge.deletedAt) {
        throw new BadRequestException('Badge is already deleted');
      }

      // Check if badge is assigned to any users
      const usedCount = await userBadgeRepo.count({
        where: { badgeId: command.badgeId },
      });
      if (usedCount > 0) {
        throw new BadRequestException(
          `Cannot delete badge. It is assigned to ${usedCount} user(s)`,
        );
      }

      // Soft delete
      await badgeRepo.softDelete(command.badgeId);
    });
  }
}
