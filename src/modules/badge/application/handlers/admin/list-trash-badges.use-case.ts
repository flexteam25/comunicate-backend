import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';

export interface ListTrashBadgesCommand {
  badgeType?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

export interface ListTrashBadgesResult {
  badges: Badge[];
  nextCursor: string | null;
  prevCursor: string | null;
}

@Injectable()
export class ListTrashBadgesUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async execute(command: ListTrashBadgesCommand | string): Promise<Badge[] | ListTrashBadgesResult> {
    // Backward compatibility: if string is passed, treat as badgeType (no cursor)
    if (typeof command === 'string') {
      return this.badgeRepository.findAllDeleted(null, command);
    }

    const result = await this.badgeRepository.findAllDeletedWithCursor(
      {
        badgeType: command.badgeType,
        sortBy: command.sortBy || 'name',
        sortDir: command.sortDir || 'ASC',
      },
      command.cursor,
      command.limit ?? 20,
    );
    return {
      badges: result.data,
      nextCursor: result.nextCursor,
      prevCursor: result.prevCursor ?? null,
    };
  }
}
