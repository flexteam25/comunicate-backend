import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteBadgeRequestImage } from '../../../domain/entities/site-badge-request-image.entity';
import { ISiteBadgeRequestImageRepository } from '../repositories/site-badge-request-image.repository';

@Injectable()
export class SiteBadgeRequestImageRepository implements ISiteBadgeRequestImageRepository {
  constructor(
    @InjectRepository(SiteBadgeRequestImage)
    private readonly repository: Repository<SiteBadgeRequestImage>,
  ) {}

  async create(image: Partial<SiteBadgeRequestImage>): Promise<SiteBadgeRequestImage> {
    const entity = this.repository.create(image);
    return this.repository.save(entity);
  }

  async createMany(images: Partial<SiteBadgeRequestImage>[]): Promise<SiteBadgeRequestImage[]> {
    const entities = this.repository.create(images);
    return this.repository.save(entities);
  }

  async findByRequestId(requestId: string): Promise<SiteBadgeRequestImage[]> {
    return this.repository.find({
      where: { requestId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async deleteByRequestId(requestId: string): Promise<void> {
    await this.repository.delete({ requestId });
  }
}
