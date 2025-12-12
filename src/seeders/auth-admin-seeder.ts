import { DataSource } from 'typeorm';
import { Admin } from '../modules/admin/domain/entities/admin.entity';
import { Role, RoleType } from '../modules/user/domain/entities/role.entity';
import { Permission, PermissionType } from '../modules/user/domain/entities/permission.entity';
import { AdminRole } from '../modules/admin/domain/entities/admin-role.entity';
import { AdminPermission } from '../modules/admin/domain/entities/admin-permission.entity';
import * as bcrypt from 'bcrypt';

export class AuthAdminSeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find admin role
      const adminRole = await queryRunner.manager.findOne(Role, {
        where: { name: 'admin', type: RoleType.ADMIN },
      });

      if (!adminRole) {
        throw new Error('Admin role not found. Please run AuthUserSeeder first.');
      }

      // Find admin permissions
      const adminPermissions = await queryRunner.manager.find(Permission, {
        where: { type: PermissionType.ADMIN },
      });

      // Create super admin
      const superAdminPassword = await bcrypt.hash('SuperAdmin@123', 10);
      const superAdmin = queryRunner.manager.create(Admin, {
        email: 'superadmin@poca.gg',
        passwordHash: superAdminPassword,
        displayName: 'Super Admin',
        isActive: true,
        isSuperAdmin: true,
      });
      await queryRunner.manager.save(superAdmin);

      // Assign admin role to super admin
      const superAdminRole = queryRunner.manager.create(AdminRole, {
        adminId: superAdmin.id,
        roleId: adminRole.id,
      });
      await queryRunner.manager.save(superAdminRole);

      // Assign all admin permissions to super admin
      for (const permission of adminPermissions) {
        const adminPermission = queryRunner.manager.create(AdminPermission, {
          adminId: superAdmin.id,
          permissionId: permission.id,
        });
        await queryRunner.manager.save(adminPermission);
      }

      await queryRunner.commitTransaction();
      console.log('✅ Admin seeder completed successfully');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Admin seeder failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

