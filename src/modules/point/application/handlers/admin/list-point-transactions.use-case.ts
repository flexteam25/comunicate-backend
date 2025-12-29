import { Injectable, Inject } from '@nestjs/common';
import { PointTransaction } from '../../../domain/entities/point-transaction.entity';
import { IPointTransactionRepository } from '../../../infrastructure/persistence/repositories/point-transaction.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

/**
 * Command to list point transactions (admin)
 */
export interface ListPointTransactionsCommand {
  /** Search by user display name */
  userName?: string;
  /** Transaction type: all, earn, spend, refund */
  type?: 'all' | 'earn' | 'spend' | 'refund';
  /** Start date (UTC) */
  startDate?: Date;
  /** End date (UTC) */
  endDate?: Date;
  /** Cursor for pagination */
  cursor?: string;
  /** Number of records per page (max 50) */
  limit?: number;
}

/**
 * Use case to list point transactions for admin
 * Returns transactions with user information
 */
@Injectable()
export class ListPointTransactionsUseCase {
  constructor(
    @Inject('IPointTransactionRepository')
    private readonly pointTransactionRepository: IPointTransactionRepository,
  ) {}

  /**
   * List point transactions with filters
   */
  async execute(
    command: ListPointTransactionsCommand,
  ): Promise<CursorPaginationResult<PointTransaction>> {
    // Convert type from 'all' to undefined to get all transactions
    const transactionType =
      command.type && command.type !== 'all' ? command.type : undefined;

    return this.pointTransactionRepository.findAllWithCursor(
      {
        userName: command.userName,
        type: transactionType,
        startDate: command.startDate,
        endDate: command.endDate,
      },
      command.cursor,
      command.limit || 20,
    );
  }
}
