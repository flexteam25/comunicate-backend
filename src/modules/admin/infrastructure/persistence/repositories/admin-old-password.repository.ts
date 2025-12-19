import {
  AdminOldPassword,
  AdminOldPasswordType,
} from '../../../../user/domain/entities/admin-old-password.entity';

export interface IAdminOldPasswordRepository {
  create(oldPassword: AdminOldPassword): Promise<AdminOldPassword>;
  findByAdminId(adminId: string, limit?: number): Promise<AdminOldPassword[]>;
  findByAdminIdAndType(
    adminId: string,
    type: AdminOldPasswordType,
    limit?: number,
  ): Promise<AdminOldPassword[]>;
}
