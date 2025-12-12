import { AdminPermission } from '../../../domain/entities/admin-permission.entity';

export interface IAdminPermissionRepository {
  create(adminPermission: AdminPermission): Promise<AdminPermission>;
  findByAdminId(adminId: string): Promise<AdminPermission[]>;
  hasPermission(adminId: string, permissionName: string): Promise<boolean>;
}

