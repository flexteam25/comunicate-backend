import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IPointExchangeRepository {
  findById(id: string, relations?: string[]): Promise<PointExchange | null>;
  findByUserIdWithCursor(
    userId: string,
    filters?: {
      status?: string;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PointExchange>>;
  findAllWithCursor(
    filters?: {
      status?: string;
      siteId?: string;
      userName?: string;
      startDate?: Date;
      endDate?: Date;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PointExchange>>;
  create(exchange: Partial<PointExchange>): Promise<PointExchange>;
  update(id: string, data: Partial<PointExchange>): Promise<PointExchange>;
}
