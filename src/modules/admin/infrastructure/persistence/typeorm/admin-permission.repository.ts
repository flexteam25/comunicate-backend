import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminPermission } from '../../../domain/entities/admin-permission.entity';
import { IAdminPermissionRepository } from '../repositories/admin-permission.repository';
import { Admin } from '../../../domain/entities/admin.entity';
import { Permission } from '../../../../user/domain/entities/permission.entity';

@Injectable()
export class AdminPermissionRepository implements IAdminPermissionRepository {
  constructor(
    @InjectRepository(AdminPermission)
    private readonly repository: Repository<AdminPermission>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(adminPermission: AdminPermission): Promise<AdminPermission> {
    const entity = this.repository.create(adminPermission);
    return this.repository.save(entity);
  }

  async findByAdminId(adminId: string): Promise<AdminPermission[]> {
    return this.repository.find({
      where: { adminId },
      relations: ['permission'],
    });
  }

  async hasPermission(adminId: string, permissionName: string): Promise<boolean> {
    // Check if admin is super admin
    const admin = await this.adminRepository.findOne({
      where: { id: adminId, deletedAt: null },
    });

    if (admin?.isSuperAdmin) {
      return true;
    }

    // Check if admin has the permission directly
    const permission = await this.permissionRepository.findOne({
      where: { name: permissionName },
    });

    if (!permission) {
      return false;
    }

    const adminPermission = await this.repository.findOne({
      where: {
        adminId,
        permissionId: permission.id,
      },
    });

    return !!adminPermission;
  }
}
