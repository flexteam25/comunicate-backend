import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge, BadgeType } from '../../../domain/entities/badge.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';

export interface CreateBadgeCommand {
  name: string;
  description?: string;
  iconUrl?: string;
  iconName?: string;
  badgeType: BadgeType;
  isActive?: boolean;
  obtain?: string;
  point?: number;
  color?: string;
}

@Injectable()
export class CreateBadgeUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateBadgeCommand): Promise<Badge> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const badgeRepo = manager.getRepository(Badge);

        // Check duplicate by name (case-insensitive), excluding soft-deleted
        const duplicate = await badgeRepo
          .createQueryBuilder('b')
          .where('LOWER(b.name) = LOWER(:name)', { name: command.name })
          .andWhere('b.deletedAt IS NULL')
          .getOne();
        if (duplicate) {
          throw new BadRequestException('Badge with this name already exists');
        }

        if (command.badgeType === BadgeType.USER && command.point === undefined) {
          throw new BadRequestException('Point is required for user badges');
        }

        const badge = badgeRepo.create({
          name: command.name,
          description: command.description,
          iconUrl: command.iconUrl,
          iconName: command.iconName,
          badgeType: command.badgeType,
          isActive: command.isActive ?? true,
          obtain: command.obtain,
          point: command.badgeType === BadgeType.USER ? (command.point ?? 0) : 0,
          color: command.color,
        });
        return badgeRepo.save(badge);
      },
    );
  }
}
