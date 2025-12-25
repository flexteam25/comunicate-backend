import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBadge } from '../../../domain/entities/user-badge.entity';
import { IUserBadgeRepository } from '../repositories/user-badge.repository';

@Injectable()
export class UserBadgeRepository implements IUserBadgeRepository {
  constructor(
    @InjectRepository(UserBadge)
    private readonly repository: Repository<UserBadge>,
  ) {}

  async findByUserId(userId: string): Promise<UserBadge[]> {
    return this.repository
      .createQueryBuilder('userBadge')
      .leftJoinAndSelect('userBadge.badge', 'badge')
      .where('userBadge.userId = :userId', { userId })
      .andWhere('badge.deletedAt IS NULL')
      .orderBy('userBadge.earnedAt', 'DESC')
      .getMany();
  }

  async assignBadge(userId: string, badgeId: string): Promise<UserBadge> {
    // Check if already assigned
    const existing = await this.repository.findOne({
      where: { userId, badgeId },
    });

    if (existing) {
      return existing;
    }

    const entity = this.repository.create({ userId, badgeId });
    return this.repository.save(entity);
  }

  async removeBadge(userId: string, badgeId: string): Promise<void> {
    await this.repository.delete({ userId, badgeId });
  }

  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, badgeId },
    });
    return count > 0;
  }

  async findByUserAndBadge(userId: string, badgeId: string): Promise<UserBadge | null> {
    return this.repository
      .createQueryBuilder('userBadge')
      .leftJoinAndSelect('userBadge.badge', 'badge')
      .where('userBadge.userId = :userId', { userId })
      .andWhere('userBadge.badgeId = :badgeId', { badgeId })
      .andWhere('badge.deletedAt IS NULL')
      .getOne();
  }
}
