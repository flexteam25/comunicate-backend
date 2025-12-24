import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IGifticonRepository {
  findById(id: string, relations?: string[]): Promise<Gifticon | null>;
  findByIdOrSlugPublic(idOrSlug: string, relations?: string[]): Promise<Gifticon | null>;
  findVisibleWithCursor(
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<Gifticon>>;
  findAllAdmin(
    filters?: {
      status?: GifticonStatus;
      search?: string;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<Gifticon>>;
  create(gifticon: Partial<Gifticon>): Promise<Gifticon>;
  update(id: string, data: Partial<Gifticon>): Promise<Gifticon>;
  softDelete(id: string): Promise<void>;
}
