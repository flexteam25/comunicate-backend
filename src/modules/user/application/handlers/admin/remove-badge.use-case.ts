import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { IUserBadgeRepository } from '../../../infrastructure/persistence/repositories/user-badge.repository';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { notFound, badRequest, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface RemoveBadgeCommand {
  userId: string;
  badgeId: string;
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
      throw notFound(MessageKeys.USER_NOT_FOUND);
    }

    // Check if badge is assigned and load full userBadge with badge
    const userBadge = await this.userBadgeRepository.findByUserAndBadge(
      command.userId,
      command.badgeId,
    );
    if (!userBadge) {
      throw badRequest(MessageKeys.BADGE_NOT_ASSIGNED_TO_USER);
    }

    // Always handle point deduction if badge has point
    if (
      userBadge.badge &&
      typeof userBadge.badge.point === 'number' &&
      userBadge.badge.point > 0
    ) {
      const badgePoint = userBadge.badge.point;
        const userWithProfile = await this.userRepository.findById(command.userId, [
          'userProfile',
        ]);
        if (userWithProfile?.userProfile) {
          const currentPoints = userWithProfile.userProfile.points ?? 0;
          const newPoints = Math.max(0, currentPoints - badgePoint);
        const pointsDeducted = currentPoints - newPoints; // Amount actually deducted

          userWithProfile.userProfile.points = newPoints;
          await this.userRepository.save(userWithProfile);

          const transaction = this.pointTransactionRepository.create({
            userId: command.userId,
            type: PointTransactionType.SPEND,
          amount: -pointsDeducted, // Negative for deduction
            balanceAfter: newPoints,
          category: 'badge_removal',
          referenceType: 'user_badge',
          referenceId: userBadge.id,
          description: `Badge removed: ${userBadge.badge.name} (Badge ID: ${command.badgeId}, User Badge ID: ${userBadge.id}). Badge point value: ${badgePoint}, Previous points: ${currentPoints}, Points deducted: ${pointsDeducted}, Remaining points: ${newPoints}${currentPoints < badgePoint ? ' (insufficient points, deducted to minimum 0)' : ''}`,
          });
          await this.pointTransactionRepository.save(transaction);
      }
    }

    // Remove badge
    await this.userBadgeRepository.removeBadge(command.userId, command.badgeId);
  }
}
