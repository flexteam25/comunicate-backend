import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadgeRequestImage } from '../../../domain/entities/user-badge-request-image.entity';
import { IUserBadgeRequestImageRepository } from '../repositories/user-badge-request-image.repository';

@Injectable()
export class UserBadgeRequestImageRepository implements IUserBadgeRequestImageRepository {
  constructor(
    @InjectRepository(UserBadgeRequestImage)
    private readonly repository: Repository<UserBadgeRequestImage>,
  ) {}

  async create(image: Partial<UserBadgeRequestImage>): Promise<UserBadgeRequestImage> {
    const entity = this.repository.create(image);
    return this.repository.save(entity);
  }

  async createMany(images: Partial<UserBadgeRequestImage>[]): Promise<UserBadgeRequestImage[]> {
    const entities = this.repository.create(images);
    return this.repository.save(entities);
  }

  async findByRequestId(requestId: string): Promise<UserBadgeRequestImage[]> {
    return this.repository.find({
      where: { requestId },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async deleteByRequestId(requestId: string): Promise<void> {
    await this.repository.delete({ requestId });
  }
}
