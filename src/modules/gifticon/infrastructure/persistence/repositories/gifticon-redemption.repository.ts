import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IGifticonRedemptionRepository {
  findById(id: string, relations?: string[]): Promise<GifticonRedemption | null>;
  findByUserIdWithCursor(
    userId: string,
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<GifticonRedemption>>;
  findAllWithCursor(
    filters?: {
      status?: string;
      userId?: string;
      gifticonId?: string;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<GifticonRedemption>>;
  create(redemption: Partial<GifticonRedemption>): Promise<GifticonRedemption>;
  update(id: string, data: Partial<GifticonRedemption>): Promise<GifticonRedemption>;
}
