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

  async create(view: Partial<PocaEventView>): Promise<PocaEventView | null> {
    // Only track views for authenticated users (skip anonymous)
    // Return null silently without throwing error to avoid breaking API
    if (!view.userId) {
      return null;
    }

    // Check if view already exists for this user and event
    const existing = await this.repository.findOne({
      where: {
        eventId: view.eventId,
        userId: view.userId,
      },
    });

    if (existing) {
      // View already exists, return existing record
      return existing;
    }

    const entity = this.repository.create(view);
    return this.repository.save(entity);
  }
}
