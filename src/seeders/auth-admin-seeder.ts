import { DataSource } from 'typeorm';
import { Admin } from '../modules/admin/domain/entities/admin.entity';
import { Role, RoleType } from '../modules/user/domain/entities/role.entity';
import {
  Permission,
  PermissionType,
} from '../modules/user/domain/entities/permission.entity';
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
      // Find admin role (should exist from auth-user-seeder)
      const adminRole = await queryRunner.manager.findOne(Role, {
        where: { name: 'admin', type: RoleType.ADMIN },
      });

      if (!adminRole) {
        throw new Error('Admin role not found. Please run AuthUserSeeder first.');
      }

      // Find admin permissions (should exist from auth-user-seeder)
      const adminPermissions = await queryRunner.manager.find(Permission, {
        where: { type: PermissionType.ADMIN },
      });

      if (adminPermissions.length === 0) {
        throw new Error('Admin permissions not found. Please run AuthUserSeeder first.');
      }

      // Upsert super admin
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const superAdminPassword: string = await bcrypt.hash('SuperAdmin@123', 10);
      // Find admin including soft-deleted ones
      let superAdmin = await queryRunner.manager
        .createQueryBuilder(Admin, 'admin')
        .where('LOWER(admin.email) = LOWER(:email)', { email: 'superadmin@poca.gg' })
        .withDeleted()
        .getOne();

      if (superAdmin) {
        // Update existing super admin and restore if soft-deleted
        superAdmin.passwordHash = superAdminPassword;
        superAdmin.displayName = 'Super Admin';
        superAdmin.isActive = true;
        superAdmin.isSuperAdmin = true;
        superAdmin.deletedAt = null; // Restore if soft-deleted
        await queryRunner.manager.save(superAdmin);
      } else {
        // Create new super admin
        const newSuperAdmin = queryRunner.manager.create(Admin, {
          email: 'superadmin@poca.gg',
          passwordHash: superAdminPassword,
          displayName: 'Super Admin',
          isActive: true,
          isSuperAdmin: true,
        });
        superAdmin = await queryRunner.manager.save(newSuperAdmin);
      }

      // Upsert admin role assignment
      let superAdminRole = await queryRunner.manager.findOne(AdminRole, {
        where: { adminId: superAdmin.id, roleId: adminRole.id },
      });

      if (!superAdminRole) {
        superAdminRole = queryRunner.manager.create(AdminRole, {
          adminId: superAdmin.id,
          roleId: adminRole.id,
        });
        await queryRunner.manager.save(superAdminRole);
      }

      // Upsert admin permissions assignments
      for (const permission of adminPermissions) {
        const existingPermission = await queryRunner.manager.findOne(AdminPermission, {
          where: { adminId: superAdmin.id, permissionId: permission.id },
        });

        if (!existingPermission) {
          const adminPermission = queryRunner.manager.create(AdminPermission, {
            adminId: superAdmin.id,
            permissionId: permission.id,
          });
          await queryRunner.manager.save(adminPermission);
        }
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
