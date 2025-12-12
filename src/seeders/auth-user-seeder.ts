import { DataSource } from 'typeorm';
import { User } from '../modules/user/domain/entities/user.entity';
import { Role, RoleType } from '../modules/user/domain/entities/role.entity';
import {
  Permission,
  PermissionType,
} from '../modules/user/domain/entities/permission.entity';
import { Badge, BadgeType } from '../modules/badge/domain/entities/badge.entity';
import { UserRole } from '../modules/user/domain/entities/user-role.entity';
import { UserPermission } from '../modules/user/domain/entities/user-permission.entity';
import { UserBadge } from '../modules/user/domain/entities/user-badge.entity';
import * as bcrypt from 'bcrypt';

export class AuthUserSeeder {
  constructor(private dataSource: DataSource) {}

  async seed(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create roles
      const userRole = queryRunner.manager.create(Role, {
        name: 'user',
        description: 'Regular user role',
        type: RoleType.USER,
      });
      await queryRunner.manager.save(userRole);

      const siteOwnerRole = queryRunner.manager.create(Role, {
        name: 'site-owner',
        description: 'Site owner role',
        type: RoleType.USER,
      });
      await queryRunner.manager.save(siteOwnerRole);

      const adminRole = queryRunner.manager.create(Role, {
        name: 'admin',
        description: 'Administrator role',
        type: RoleType.ADMIN,
      });
      await queryRunner.manager.save(adminRole);

      // Create permissions - Admin permissions
      const adminPermissions = [
        { name: 'users.create', description: 'Create users', type: PermissionType.ADMIN },
        { name: 'users.read', description: 'Read users', type: PermissionType.ADMIN },
        { name: 'users.update', description: 'Update users', type: PermissionType.ADMIN },
        { name: 'users.delete', description: 'Delete users', type: PermissionType.ADMIN },
        { name: 'sites.create', description: 'Create sites', type: PermissionType.ADMIN },
        { name: 'sites.update', description: 'Update sites', type: PermissionType.ADMIN },
        { name: 'sites.delete', description: 'Delete sites', type: PermissionType.ADMIN },
        { name: 'sites.verify', description: 'Verify sites', type: PermissionType.ADMIN },
        {
          name: 'posts.moderate',
          description: 'Moderate posts',
          type: PermissionType.ADMIN,
        },
        {
          name: 'reviews.moderate',
          description: 'Moderate reviews',
          type: PermissionType.ADMIN,
        },
        {
          name: 'scam-reports.moderate',
          description: 'Moderate scam reports',
          type: PermissionType.ADMIN,
        },
        {
          name: 'scam-reports.publish',
          description: 'Publish scam reports',
          type: PermissionType.ADMIN,
        },
        {
          name: 'admin.access',
          description: 'Access admin panel',
          type: PermissionType.ADMIN,
        },
        {
          name: 'admin.create',
          description: 'Create admin',
          type: PermissionType.ADMIN,
        },
        {
          name: 'admin.read',
          description: 'Read admin',
          type: PermissionType.ADMIN,
        },
        {
          name: 'admin.update',
          description: 'Update admin',
          type: PermissionType.ADMIN,
        },
        {
          name: 'admin.delete',
          description: 'Delete admin',
          type: PermissionType.ADMIN,
        },
        {
          name: 'site-applications.approve',
          description: 'Approve site applications',
          type: PermissionType.ADMIN,
        },
        {
          name: 'site-manager-applications.approve',
          description: 'Approve site manager applications',
          type: PermissionType.ADMIN,
        },
      ];

      // Create permissions - User permissions (if needed in future)
      const userPermissions: Array<{
        name: string;
        description: string;
        type: PermissionType;
      }> = [
        // User permissions can be added here if needed
        // Example: { name: 'posts.create', description: 'Create posts', type: PermissionType.USER },
      ];

      // Combine all permissions
      const permissions = [...adminPermissions, ...userPermissions];

      const savedPermissions = [];
      for (const perm of permissions) {
        const permission = queryRunner.manager.create(Permission, perm);
        await queryRunner.manager.save(permission);
        savedPermissions.push(permission);
      }

      // Create badges
      const badges = [
        {
          name: 'Early Adopter',
          description: 'Joined in early days',
          badgeType: BadgeType.USER,
        },
        {
          name: 'Verified User',
          description: 'Verified account',
          badgeType: BadgeType.USER,
        },
        {
          name: 'Top Reviewer',
          description: 'Top reviewer badge',
          badgeType: BadgeType.USER,
        },
        {
          name: 'Trusted Site',
          description: 'Trusted site badge',
          badgeType: BadgeType.SITE,
        },
        {
          name: 'Premium Site',
          description: 'Premium site badge',
          badgeType: BadgeType.SITE,
        },
      ];

      const savedBadges = [];
      for (const badge of badges) {
        const badgeEntity = queryRunner.manager.create(Badge, badge);
        await queryRunner.manager.save(badgeEntity);
        savedBadges.push(badgeEntity);
      }

      // Create test users
      const passwordHash = await bcrypt.hash('password123', 10);

      const regularUser = queryRunner.manager.create(User, {
        email: 'user@example.com',
        passwordHash,
        displayName: 'Regular User',
        isActive: true,
      });
      await queryRunner.manager.save(regularUser);

      const siteOwnerUser = queryRunner.manager.create(User, {
        email: 'siteowner@example.com',
        passwordHash,
        displayName: 'Site Owner',
        isActive: true,
      });
      await queryRunner.manager.save(siteOwnerUser);

      const adminUser = queryRunner.manager.create(User, {
        email: 'admin@example.com',
        passwordHash,
        displayName: 'Admin User',
        isActive: true,
      });
      await queryRunner.manager.save(adminUser);

      // Assign roles
      const userUserRole = queryRunner.manager.create(UserRole, {
        userId: regularUser.id,
        roleId: userRole.id,
      });
      await queryRunner.manager.save(userUserRole);

      const siteOwnerUserRole = queryRunner.manager.create(UserRole, {
        userId: siteOwnerUser.id,
        roleId: siteOwnerRole.id,
      });
      await queryRunner.manager.save(siteOwnerUserRole);

      const adminUserRole = queryRunner.manager.create(UserRole, {
        userId: adminUser.id,
        roleId: adminRole.id,
      });
      await queryRunner.manager.save(adminUserRole);

      // Assign permissions directly to users (not through roles)
      // Admin user gets all permissions
      for (const permission of savedPermissions) {
        const userPermission = queryRunner.manager.create(UserPermission, {
          userId: adminUser.id,
          permissionId: permission.id,
        });
        await queryRunner.manager.save(userPermission);
      }

      // Site owner gets site-related permissions
      const siteOwnerPermissions = savedPermissions.filter(
        (p) => p.name === 'sites.update' || p.name === 'sites.create',
      );
      for (const permission of siteOwnerPermissions) {
        const userPermission = queryRunner.manager.create(UserPermission, {
          userId: siteOwnerUser.id,
          permissionId: permission.id,
        });
        await queryRunner.manager.save(userPermission);
      }

      // Assign badges
      const earlyAdopterBadge = savedBadges.find((b) => b.name === 'Early Adopter');
      if (earlyAdopterBadge) {
        const userBadge = queryRunner.manager.create(UserBadge, {
          userId: regularUser.id,
          badgeId: earlyAdopterBadge.id,
        });
        await queryRunner.manager.save(userBadge);
      }

      await queryRunner.commitTransaction();
      console.log('✅ Auth user seeder completed successfully!');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error seeding auth user data:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
