import { AdvertisingContact } from '../../../domain/entities/advertising-contact.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface AdvertisingContactFilters {
  userId?: string;
  isViewed?: boolean;
}

export interface IAdvertisingContactRepository {
  findById(id: string, relations?: string[]): Promise<AdvertisingContact | null>;
  findAllWithCursor(
    filters?: AdvertisingContactFilters,
    cursor?: string,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): Promise<CursorPaginationResult<AdvertisingContact>>;
  create(advertisingContact: Partial<AdvertisingContact>): Promise<AdvertisingContact>;
  update(id: string, data: Partial<AdvertisingContact>): Promise<AdvertisingContact>;
  findByUserId(userId: string): Promise<AdvertisingContact[]>;
}

