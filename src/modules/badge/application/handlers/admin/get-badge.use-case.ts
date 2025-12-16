import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';

export interface GetBadgeCommand {
  badgeId: string;
}

@Injectable()
export class GetBadgeUseCase {
  constructor(
    @Inject('IBadgeRepository')
    private readonly badgeRepository: IBadgeRepository,
  ) {}

  async execute(command: GetBadgeCommand): Promise<Badge> {
    const badge = await this.badgeRepository.findByIdIncludingDeleted(command.badgeId);
    if (!badge) {
      throw new NotFoundException('Badge not found');
    }
    return badge;
  }
}
