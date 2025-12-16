import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';

@Injectable()
export class ListBadgesUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async execute(badgeType?: string): Promise<Badge[]> {
    return this.badgeRepository.findAllIncludeDeleted(null, badgeType);
  }
}
