import { PointTransaction } from '../../../domain/entities/point-transaction.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IPointTransactionRepository {
  findByUserIdWithCursor(
    userId: string,
    filters?: {
      type?: 'earn' | 'spend' | 'refund';
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PointTransaction>>;
  findAllWithCursor(
    filters?: {
      userName?: string;
      type?: 'earn' | 'spend' | 'refund';
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PointTransaction>>;
  create(transaction: Partial<PointTransaction>): Promise<PointTransaction>;
}
