import { Injectable, Inject } from '@nestjs/common';
import {
  IAdvertisingContactRepository,
  AdvertisingContactFilters,
} from '../../../infrastructure/persistence/repositories/advertising-contact.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { AdvertisingContact } from '../../../domain/entities/advertising-contact.entity';

export interface ListAdvertisingContactsCommand {
  filters?: AdvertisingContactFilters;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListAdvertisingContactsUseCase {
  constructor(
    @Inject('IAdvertisingContactRepository')
    private readonly advertisingContactRepository: IAdvertisingContactRepository,
  ) {}

  async execute(
    command: ListAdvertisingContactsCommand,
  ): Promise<CursorPaginationResult<AdvertisingContact>> {
    return this.advertisingContactRepository.findAllWithCursor(
      command.filters,
      command.cursor,
      command.limit,
      command.sortBy,
      command.sortOrder,
    );
  }
}
