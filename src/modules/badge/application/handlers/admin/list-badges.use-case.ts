import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';

export interface ListBadgesCommand {
  badgeType?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

export interface ListBadgesResult {
  badges: Badge[];
  nextCursor: string | null;
  previousCursor: string | null;
}

@Injectable()
export class ListBadgesUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async execute(command: ListBadgesCommand | string): Promise<Badge[] | ListBadgesResult> {
    // Backward compatibility: if string is passed, treat as badgeType (no cursor)
    if (typeof command === 'string') {
      return this.badgeRepository.findAll(null, command);
    }

    const result = await this.badgeRepository.findAllWithCursor(
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
      previousCursor: result.previousCursor ?? null,
    };
  }
}
