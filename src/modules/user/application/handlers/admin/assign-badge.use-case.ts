import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import { Badge, BadgeType } from '../../../../badge/domain/entities/badge.entity';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserBadge } from '../../../domain/entities/user-badge.entity';

export interface AssignBadgeCommand {
  userId: string;
  badgeId: string;
  handlePoint?: boolean;
}

@Injectable()
export class AssignBadgeUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
  ) {}

  async execute(command: AssignBadgeCommand): Promise<UserBadge> {
    // Check if user exists (with profile for points)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if badge exists, is active, and is of type 'user'
    const badge = await this.badgeRepository.findOne({
      where: {
        id: command.badgeId,
        deletedAt: null,
        isActive: true,
        badgeType: BadgeType.USER,
      },
    });
    if (!badge) {
      throw new BadRequestException('Badge not found or not available');
    }
    if (badge.badgeType !== BadgeType.USER) {
      throw new BadRequestException('Badge must be of type "user"');
    }

    // Check if already assigned
    const hasBadge = await this.userBadgeRepository.hasBadge(
      command.userId,
      command.badgeId,
    );
    if (hasBadge) {
      throw new BadRequestException('Badge already assigned to this user');
    }

    // Assign badge with active = false (user will decide which badge to activate)
    const userBadge = await this.userBadgeRepository.assignBadge(
      command.userId,
      command.badgeId,
      false,
    );

    // Handle point reward if requested and badge has point
    if (command.handlePoint && typeof badge.point === 'number' && badge.point > 0) {
      const currentPoints = user.userProfile?.points ?? 0;
      const newPoints = currentPoints + badge.point;

      if (user.userProfile) {
        user.userProfile.points = newPoints;
      }

      await this.userRepository.save(user);

      const transaction = this.pointTransactionRepository.create({
        userId: command.userId,
        type: PointTransactionType.EARN,
        amount: badge.point,
        balanceAfter: newPoints,
        category: 'badge_reward',
        referenceType: 'badge',
        referenceId: badge.id,
        description: `Badge reward: ${badge.name}`,
      });
      await this.pointTransactionRepository.save(transaction);
    }

    return userBadge;
  }
}
