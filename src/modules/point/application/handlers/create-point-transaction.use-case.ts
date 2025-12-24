import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  PointTransaction,
  PointTransactionType,
} from '../../domain/entities/point-transaction.entity';
import { IPointTransactionRepository } from '../../infrastructure/persistence/repositories/point-transaction.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';

/**
 * Command to create a new point transaction
 */
export interface CreatePointTransactionCommand {
  userId: string;
  type: PointTransactionType;
  /**
   * Points amount in transaction
   * - Positive for earn and refund
   * - Negative for spend
   */
  amount: number;
  /** Balance after transaction */
  balanceAfter: number;
  /** Transaction category (e.g., 'gifticon_redemption', 'point_exchange') */
  category: string;
  /** Reference object type (e.g., 'gifticon_redemption') */
  referenceType?: string;
  /** ID of the reference object */
  referenceId?: string;
  /** Transaction description */
  description?: string;
  /** Additional information */
  metadata?: Record<string, any>;
}

/**
 * Use case to create a new point transaction
 * Used as an internal utility for other use cases
 */
@Injectable()
export class CreatePointTransactionUseCase {
  constructor(
    @Inject('IPointTransactionRepository')
    private readonly pointTransactionRepository: IPointTransactionRepository,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Create a new point transaction within a transaction
   * Ensures data consistency
   */
  async execute(command: CreatePointTransactionCommand): Promise<PointTransaction> {
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        const transactionRepo = manager.getRepository(PointTransaction);
        const transaction = transactionRepo.create({
          userId: command.userId,
          type: command.type,
          amount: command.amount,
          balanceAfter: command.balanceAfter,
          category: command.category,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          description: command.description,
          metadata: command.metadata,
        });
        return transactionRepo.save(transaction);
      },
    );
  }
}
