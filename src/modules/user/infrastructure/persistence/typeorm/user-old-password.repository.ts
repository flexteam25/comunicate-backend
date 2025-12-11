import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserOldPassword, UserOldPasswordType } from '../../../domain/entities/user-old-password.entity';
import { IUserOldPasswordRepository } from '../repositories/user-old-password.repository';

@Injectable()
export class UserOldPasswordRepository implements IUserOldPasswordRepository {
  constructor(
    @InjectRepository(UserOldPassword)
    private readonly repository: Repository<UserOldPassword>,
  ) {}

  async create(oldPassword: UserOldPassword): Promise<UserOldPassword> {
    const entity = this.repository.create(oldPassword);
    return this.repository.save(entity);
  }

  async findByUserId(userId: string, limit?: number): Promise<UserOldPassword[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('user_old_password')
      .where('user_old_password.userId = :userId', { userId })
      .orderBy('user_old_password.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  async findByUserIdAndType(
    userId: string,
    type: UserOldPasswordType,
    limit?: number,
  ): Promise<UserOldPassword[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('user_old_password')
      .where('user_old_password.userId = :userId', { userId })
      .andWhere('user_old_password.type = :type', { type })
      .orderBy('user_old_password.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }
}

