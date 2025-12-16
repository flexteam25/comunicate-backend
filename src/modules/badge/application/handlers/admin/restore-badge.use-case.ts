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

export interface RestoreBadgeCommand {
  badgeId: string;
}

@Injectable()
export class RestoreBadgeUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RestoreBadgeCommand): Promise<void> {
    await this.transactionService.executeInTransaction(async (manager: EntityManager) => {
      const badgeRepo = manager.getRepository(Badge);

      const badge = await badgeRepo.findOne({
        where: { id: command.badgeId },
        withDeleted: true,
      });
      if (!badge) {
        throw new NotFoundException('Badge not found');
      }

      if (!badge.deletedAt) {
        throw new BadRequestException('Badge is not deleted');
      }

      await badgeRepo.restore(command.badgeId);
    });
  }
}
