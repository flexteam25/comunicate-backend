import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface IPocaEventRepository {
  findById(id: string, relations?: string[]): Promise<PocaEvent | null>;
  findByIdOrSlugPublic(idOrSlug: string, relations?: string[]): Promise<PocaEvent | null>;
  findVisibleWithCursor(
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PocaEvent>>;
  findAllAdmin(
    filters?: {
      status?: PocaEventStatus;
      search?: string;
    },
    cursor?: string,
    limit?: number,
  ): Promise<CursorPaginationResult<PocaEvent>>;
  create(event: Partial<PocaEvent>): Promise<PocaEvent>;
  update(id: string, data: Partial<PocaEvent>): Promise<PocaEvent>;
  softDelete(id: string): Promise<void>;
  incrementViewCount(id: string): Promise<void>;
}
