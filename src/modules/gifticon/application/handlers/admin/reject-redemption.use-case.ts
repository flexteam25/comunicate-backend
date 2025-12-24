import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  GifticonRedemption,
  GifticonRedemptionStatus,
} from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';

export interface RejectRedemptionCommand {
  redemptionId: string;
  adminId: string;
  reason?: string;
}

/**
 * Use case for admin to reject gifticon redemption
 * - Only allow reject if status = pending
 * - Refund points to user
 * - Update status = rejected
 */
@Injectable()
export class RejectRedemptionUseCase {
  constructor(
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RejectRedemptionCommand): Promise<GifticonRedemption> {
    const redemption = await this.redemptionRepository.findById(command.redemptionId);

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    if (redemption.status !== GifticonRedemptionStatus.PENDING) {
      throw new BadRequestException('Only pending redemptions can be rejected');
    }

    // Execute refund and status update in transaction
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: redemption.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!userProfile) {
          throw new NotFoundException('User profile not found');
        }

        // Refund points to user
        const newBalance = userProfile.points + redemption.pointsUsed;
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Update redemption status = rejected
        const redemptionRepo = manager.getRepository(GifticonRedemption);
        await redemptionRepo.update(command.redemptionId, {
          status: GifticonRedemptionStatus.REJECTED,
          cancelledAt: new Date(),
          cancelledBy: command.adminId,
          cancellationReason: command.reason,
        });

        // Create refund transaction for history
        const pointTransactionRepo = manager.getRepository(PointTransaction);
        const pointTransaction = pointTransactionRepo.create({
          userId: redemption.userId,
          type: PointTransactionType.REFUND,
          amount: redemption.pointsUsed, // Positive for refund
          balanceAfter: newBalance,
          category: 'gifticon_redemption_refund',
          referenceType: 'gifticon_redemption',
          referenceId: redemption.id,
          description: `Gifticon Redemption Refund: ${redemption.gifticonSnapshot?.title || 'Unknown'} ${redemption.pointsUsed}원`,
        });
        await pointTransactionRepo.save(pointTransaction);

        // Get updated redemption to return
        const updatedRedemption = await redemptionRepo.findOne({
          where: { id: command.redemptionId },
        });

        if (!updatedRedemption) {
          throw new NotFoundException('Redemption not found after update');
        }

        return updatedRedemption;
      },
    );
  }
}
