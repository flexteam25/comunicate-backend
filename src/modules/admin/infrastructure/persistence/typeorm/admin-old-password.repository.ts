import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminOldPassword, AdminOldPasswordType } from '../../../../user/domain/entities/admin-old-password.entity';
import { IAdminOldPasswordRepository } from '../repositories/admin-old-password.repository';

@Injectable()
export class AdminOldPasswordRepository implements IAdminOldPasswordRepository {
  constructor(
    @InjectRepository(AdminOldPassword)
    private readonly repository: Repository<AdminOldPassword>,
  ) {}

  async create(oldPassword: AdminOldPassword): Promise<AdminOldPassword> {
    const entity = this.repository.create(oldPassword);
    return this.repository.save(entity);
  }

  async findByAdminId(adminId: string, limit?: number): Promise<AdminOldPassword[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('admin_old_password')
      .where('admin_old_password.adminId = :adminId', { adminId })
      .orderBy('admin_old_password.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  async findByAdminIdAndType(
    adminId: string,
    type: AdminOldPasswordType,
    limit?: number,
  ): Promise<AdminOldPassword[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('admin_old_password')
      .where('admin_old_password.adminId = :adminId', { adminId })
      .andWhere('admin_old_password.type = :type', { type })
      .orderBy('admin_old_password.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }
}

