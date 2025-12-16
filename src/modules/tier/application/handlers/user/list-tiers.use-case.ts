import { Injectable, Inject } from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import { Tier } from '../../../domain/entities/tier.entity';

@Injectable()
export class ListTiersUseCase {
  constructor(
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
  ) {}

  async execute(): Promise<Tier[]> {
    // Only return active, non-deleted tiers for users
    return this.tierRepository.findAll(1);
  }
}

