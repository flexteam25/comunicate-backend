import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';

export interface ListTrashBadgesCommand {
  badgeType?: string;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

@Injectable()
export class ListTrashBadgesUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async execute(command: ListTrashBadgesCommand | string): Promise<Badge[]> {
    // Backward compatibility: if string is passed, treat as badgeType
    if (typeof command === 'string') {
      return this.badgeRepository.findAllDeleted(null, command);
    }

    return this.badgeRepository.findAllDeleted(
      null,
      command.badgeType,
      command.sortBy || 'name',
      command.sortDir || 'ASC',
    );
  }
}
