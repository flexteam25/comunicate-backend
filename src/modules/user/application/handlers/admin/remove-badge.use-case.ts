import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface RemoveBadgeCommand {
  userId: string;
  badgeId: string;
  handlePoint?: boolean;
}

@Injectable()
export class RemoveBadgeUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserBadgeRepository')
    private readonly userBadgeRepository: IUserBadgeRepository,
    @InjectRepository(PointTransaction)
    private readonly pointTransactionRepository: Repository<PointTransaction>,
  ) {}

  async execute(command: RemoveBadgeCommand): Promise<void> {
    // Check if user exists
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if badge is assigned and load full userBadge with badge
    const userBadge = await this.userBadgeRepository.findByUserAndBadge(
      command.userId,
      command.badgeId,
    );
    if (!userBadge) {
      throw new BadRequestException('Badge is not assigned to this user');
    }

    // Optionally handle point deduction
    if (
      command.handlePoint &&
      userBadge.badge &&
      typeof userBadge.badge.point === 'number'
    ) {
      const badgePoint = userBadge.badge.point;
      if (badgePoint > 0) {
        const userWithProfile = await this.userRepository.findById(command.userId, [
          'userProfile',
        ]);
        if (userWithProfile?.userProfile) {
          const currentPoints = userWithProfile.userProfile.points ?? 0;
          const newPoints = Math.max(0, currentPoints - badgePoint);
          const delta = newPoints - currentPoints; // <= 0

          userWithProfile.userProfile.points = newPoints;
          await this.userRepository.save(userWithProfile);

          const transaction = this.pointTransactionRepository.create({
            userId: command.userId,
            type: PointTransactionType.SPEND,
            amount: delta,
            balanceAfter: newPoints,
            category: 'badge_reward',
            referenceType: 'badge',
            referenceId: command.badgeId,
            description: `Badge removed: ${userBadge.badge.name}`,
          });
          await this.pointTransactionRepository.save(transaction);
        }
      }
    }

    // Remove badge
    await this.userBadgeRepository.removeBadge(command.userId, command.badgeId);
  }
}
