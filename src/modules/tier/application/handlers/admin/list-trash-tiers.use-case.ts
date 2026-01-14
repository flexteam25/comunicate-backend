import { Injectable, Inject } from '@nestjs/common';
import { ITierRepository } from '../../../infrastructure/persistence/repositories/tier.repository';
import { Tier } from '../../../domain/entities/tier.entity';

@Injectable()
export class ListTrashTiersUseCase {
  constructor(
    @Inject('ITierRepository')
    private readonly tierRepository: ITierRepository,
  ) {}

  async execute(): Promise<Tier[]> {
    return this.tierRepository.findAllDeleted();
  }
}
