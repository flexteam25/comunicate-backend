import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PocaEventView } from '../../../domain/entities/poca-event-view.entity';
import { IPocaEventViewRepository } from '../repositories/poca-event-view.repository';

@Injectable()
export class PocaEventViewRepository implements IPocaEventViewRepository {
  constructor(
    @InjectRepository(PocaEventView)
    private readonly repository: Repository<PocaEventView>,
  ) {}

  async create(view: Partial<PocaEventView>): Promise<PocaEventView> {
    const entity = this.repository.create(view);
    return this.repository.save(entity);
  }
}
