import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteView } from '../../../domain/entities/site-view.entity';
import { ISiteViewRepository } from '../repositories/site-view.repository';

@Injectable()
export class SiteViewRepository implements ISiteViewRepository {
  constructor(
    @InjectRepository(SiteView)
    private readonly repository: Repository<SiteView>,
  ) {}

  async create(view: Partial<SiteView>): Promise<SiteView> {
    const entity = this.repository.create(view);
    return this.repository.save(entity);
  }
}

