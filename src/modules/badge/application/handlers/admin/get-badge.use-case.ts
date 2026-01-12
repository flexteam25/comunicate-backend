import { Injectable, Inject } from '@nestjs/common';
import { IBadgeRepository } from '../../../infrastructure/persistence/repositories/badge.repository';
import { Badge } from '../../../domain/entities/badge.entity';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

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
      throw notFound(MessageKeys.BADGE_NOT_FOUND);
    }
    return badge;
  }
}
