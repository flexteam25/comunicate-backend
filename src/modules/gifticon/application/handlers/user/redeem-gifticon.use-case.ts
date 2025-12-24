import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Gifticon, GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { GifticonRedemption, GifticonRedemptionStatus } from '../../../domain/entities/gifticon-redemption.entity';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { User } from '../../../../user/domain/entities/user.entity';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { PointTransaction, PointTransactionType } from '../../../../point/domain/entities/point-transaction.entity';
import { randomUUID } from 'crypto';

/**
 * Command to redeem gifticon
 */
export interface RedeemGifticonCommand {
  userId: string;
  gifticonId: string;
}

/**
 * Use case for user to redeem gifticon with points
 * - Validate gifticon (status = published, within valid period)
 * - Check user has sufficient points
 * - Deduct points from userProfile.points
 * - Create gifticon_redemption record (status = pending)
 * - Create point_transaction record (type = spend)
 * - Generate redemption_code (UUID format)
 * - Save gifticon_snapshot
 */
@Injectable()
export class RedeemGifticonUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Execute gifticon redemption with points
   * All operations are performed within a transaction to ensure data consistency
   */
  async execute(command: RedeemGifticonCommand): Promise<GifticonRedemption> {
    // Check gifticon exists
    const gifticon = await this.gifticonRepository.findById(command.gifticonId);
    if (!gifticon) {
      throw new NotFoundException('Gifticon not found');
    }

    // Check gifticon has status = published
    if (gifticon.status !== GifticonStatus.PUBLISHED) {
      throw new BadRequestException('Gifticon is not available for redemption');
    }

    // Check gifticon is within valid period
    const now = new Date();
    if (gifticon.startsAt && gifticon.startsAt > now) {
      throw new BadRequestException('Gifticon has not started yet');
    }

    if (gifticon.endsAt && gifticon.endsAt < now) {
      throw new BadRequestException('Gifticon has expired');
    }

    // Check user has sufficient points (preliminary check before transaction)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user || !user.userProfile) {
      throw new NotFoundException('User not found');
    }

    if (user.userProfile.points < gifticon.amount) {
      throw new BadRequestException('Insufficient points');
    }

    // Execute all operations in transaction to ensure data consistency
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: command.userId },
          lock: { mode: 'pessimistic_write' },
        });

        // Recheck balance after lock (in case points were deducted while waiting)
        if (!userProfile || userProfile.points < gifticon.amount) {
          throw new BadRequestException('Insufficient points');
        }

        // Calculate new balance after deducting points
        const newBalance = userProfile.points - gifticon.amount;

        // Update user points
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Create redemption record with status = pending (requires admin approval)
        const redemptionRepo = manager.getRepository(GifticonRedemption);
        const redemption = redemptionRepo.create({
          userId: command.userId,
          gifticonId: command.gifticonId,
          pointsUsed: gifticon.amount,
          status: GifticonRedemptionStatus.PENDING,
          redemptionCode: randomUUID(), // Generate UUID format
          // Save snapshot to ensure data integrity if gifticon is edited
          gifticonSnapshot: {
            title: gifticon.title,
            amount: gifticon.amount,
            imageUrl: gifticon.imageUrl,
            summary: gifticon.summary,
          },
        });
        const savedRedemption = await redemptionRepo.save(redemption);

        // Create point transaction for history
        const pointTransactionRepo = manager.getRepository(PointTransaction);
        const pointTransaction = pointTransactionRepo.create({
          userId: command.userId,
          type: PointTransactionType.SPEND,
          amount: -gifticon.amount, // Negative for spend
          balanceAfter: newBalance,
          category: 'gifticon_redemption',
          referenceType: 'gifticon_redemption',
          referenceId: savedRedemption.id,
          description: `Gifticon: ${gifticon.title} ${gifticon.amount}원`,
        });
        await pointTransactionRepo.save(pointTransaction);

        return savedRedemption;
      },
    );
  }
}
