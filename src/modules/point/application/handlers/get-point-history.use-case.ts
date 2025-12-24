import { Injectable, Inject } from '@nestjs/common';
import { PointTransaction } from '../../domain/entities/point-transaction.entity';
import { IPointTransactionRepository } from '../../infrastructure/persistence/repositories/point-transaction.repository';
import { CursorPaginationResult } from '../../../../shared/utils/cursor-pagination.util';

/**
 * Command to get point transaction history
 */
export interface GetPointHistoryCommand {
  userId: string;
  /** Transaction type: all, earn, spend, refund */
  type?: 'all' | 'earn' | 'spend' | 'refund';
  /** Cursor for pagination */
  cursor?: string;
  /** Number of records per page (max 50) */
  limit?: number;
}

/**
 * Use case to get user's point transaction history
 * Returns a flat list with cursor pagination (frontend groups by date if needed)
 */
@Injectable()
export class GetPointHistoryUseCase {
  constructor(
    @Inject('IPointTransactionRepository')
    private readonly pointTransactionRepository: IPointTransactionRepository,
  ) {}

  /**
   * Get point transaction history with type filter (if provided)
   */
  async execute(
    command: GetPointHistoryCommand,
  ): Promise<CursorPaginationResult<PointTransaction>> {
    // Convert type from 'all' to undefined to get all transactions
    const transactionType =
      command.type && command.type !== 'all'
        ? (command.type as 'earn' | 'spend' | 'refund')
        : undefined;

    return this.pointTransactionRepository.findByUserIdWithCursor(
      command.userId,
      transactionType ? { type: transactionType } : undefined,
      command.cursor,
      command.limit || 20,
    );
  }
}
