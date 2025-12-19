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
      // Upsert roles
      const rolesData = [
        { name: 'user', description: 'Regular user role', type: RoleType.USER },
        {
          name: 'site-owner',
          description: 'Site owner role',
          type: RoleType.USER,
        },
        {
          name: 'admin',
          description: 'Administrator role',
          type: RoleType.ADMIN,
        },
      ];

      const savedRoles = [];
      for (const roleData of rolesData) {
        let role = await queryRunner.manager.findOne(Role, {
          where: { name: roleData.name },
        });

        if (role) {
          // Update existing role
          role.description = roleData.description;
          role.type = roleData.type;
          await queryRunner.manager.save(role);
        } else {
          // Create new role
          role = queryRunner.manager.create(Role, roleData);
          await queryRunner.manager.save(role);
        }
        savedRoles.push(role);
      }

      const userRole = savedRoles.find((r: Role) => r.name === 'user') as
        | Role
        | undefined;
      const siteOwnerRole = savedRoles.find((r: Role) => r.name === 'site-owner') as
        | Role
        | undefined;
      const adminRole = savedRoles.find((r: Role) => r.name === 'admin') as
        | Role
        | undefined;

      if (!userRole || !siteOwnerRole || !adminRole) {
        throw new Error('Failed to create required roles');
      }

      // Upsert permissions - Admin permissions
      const adminPermissions = [
        {
          name: 'users.create',
          description: 'Create users',
          type: PermissionType.ADMIN,
        },
        {
          name: 'users.read',
          description: 'Read users',
          type: PermissionType.ADMIN,
        },
        {
          name: 'users.update',
          description: 'Update users',
          type: PermissionType.ADMIN,
        },
        {
          name: 'users.delete',
          description: 'Delete users',
          type: PermissionType.ADMIN,
        },
        {
          name: 'sites.create',
          description: 'Create sites',
          type: PermissionType.ADMIN,
        },
        {
          name: 'sites.update',
          description: 'Update sites',
          type: PermissionType.ADMIN,
        },
        {
          name: 'sites.delete',
          description: 'Delete sites',
          type: PermissionType.ADMIN,
        },
        {
          name: 'sites.verify',
          description: 'Verify sites',
          type: PermissionType.ADMIN,
        },
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
        {
          name: 'site.create',
          description: 'Create sites',
          type: PermissionType.ADMIN,
        },
        {
          name: 'site.update',
          description: 'Update sites',
          type: PermissionType.ADMIN,
        },
        {
          name: 'site.delete',
          description: 'Delete sites',
          type: PermissionType.ADMIN,
        },
        {
          name: 'site.view',
          description: 'View sites',
          type: PermissionType.ADMIN,
        },
        // Support module permissions
        {
          name: 'support.inquiry.view',
          description: 'View support inquiries',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.inquiry.reply',
          description: 'Reply to support inquiries',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.feedback.view',
          description: 'View user feedback',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.feedback.update',
          description: 'Update/mark feedback as viewed',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.bug.view',
          description: 'View bug reports',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.bug.update',
          description: 'Update/mark bug reports as viewed',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.advertising.view',
          description: 'View advertising contacts',
          type: PermissionType.ADMIN,
        },
        {
          name: 'support.advertising.update',
          description: 'Update/mark advertising contacts as viewed',
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
        let permission = await queryRunner.manager.findOne(Permission, {
          where: { name: perm.name },
        });

        if (permission) {
          // Update existing permission
          permission.description = perm.description;
          permission.type = perm.type;
          await queryRunner.manager.save(permission);
        } else {
          // Create new permission
          permission = queryRunner.manager.create(Permission, perm);
          await queryRunner.manager.save(permission);
        }
        savedPermissions.push(permission);
      }

      // Upsert badges
      const badgesData = [
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
      for (const badgeData of badgesData) {
        let badge = await queryRunner.manager.findOne(Badge, {
          where: { name: badgeData.name },
        });

        if (badge) {
          // Update existing badge
          badge.description = badgeData.description;
          badge.badgeType = badgeData.badgeType;
          await queryRunner.manager.save(badge);
        } else {
          // Create new badge
          badge = queryRunner.manager.create(Badge, badgeData);
          await queryRunner.manager.save(badge);
        }
        savedBadges.push(badge);
      }

      // Upsert test users
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const passwordHash: string = await bcrypt.hash('password123', 10);

      let regularUser = await queryRunner.manager.findOne(User, {
        where: { email: 'user@example.com' },
      });
      if (regularUser) {
        regularUser.passwordHash = passwordHash;
        regularUser.displayName = 'Regular User';
        regularUser.isActive = true;
        await queryRunner.manager.save(regularUser);
      } else {
        const newRegularUser = queryRunner.manager.create(User, {
          email: 'user@example.com',
          passwordHash,
          displayName: 'Regular User',
          isActive: true,
        });
        regularUser = await queryRunner.manager.save(newRegularUser);
      }

      let siteOwnerUser = await queryRunner.manager.findOne(User, {
        where: { email: 'siteowner@example.com' },
      });
      if (siteOwnerUser) {
        siteOwnerUser.passwordHash = passwordHash;
        siteOwnerUser.displayName = 'Site Owner';
        siteOwnerUser.isActive = true;
        await queryRunner.manager.save(siteOwnerUser);
      } else {
        const newSiteOwnerUser = queryRunner.manager.create(User, {
          email: 'siteowner@example.com',
          passwordHash,
          displayName: 'Site Owner',
          isActive: true,
        });
        siteOwnerUser = await queryRunner.manager.save(newSiteOwnerUser);
      }

      // Upsert user roles
      if (regularUser && userRole) {
        let userUserRole = await queryRunner.manager.findOne(UserRole, {
          where: { userId: regularUser.id, roleId: userRole.id },
        });
        if (!userUserRole) {
          userUserRole = queryRunner.manager.create(UserRole, {
            userId: regularUser.id,
            roleId: userRole.id,
          });
          await queryRunner.manager.save(userUserRole);
        }
      }

      if (siteOwnerUser && siteOwnerRole) {
        let siteOwnerUserRole = await queryRunner.manager.findOne(UserRole, {
          where: { userId: siteOwnerUser.id, roleId: siteOwnerRole.id },
        });
        if (!siteOwnerUserRole) {
          siteOwnerUserRole = queryRunner.manager.create(UserRole, {
            userId: siteOwnerUser.id,
            roleId: siteOwnerRole.id,
          });
          await queryRunner.manager.save(siteOwnerUserRole);
        }
      }

      // Upsert user permissions
      if (siteOwnerUser) {
        const siteOwnerPermissions = savedPermissions.filter(
          (p: Permission) => p.name === 'sites.update' || p.name === 'sites.create',
        );
        for (const permission of siteOwnerPermissions) {
          const existingPermission = await queryRunner.manager.findOne(UserPermission, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            where: { userId: siteOwnerUser.id, permissionId: permission.id },
          });

          if (!existingPermission) {
            const userPermission = queryRunner.manager.create(UserPermission, {
              userId: siteOwnerUser.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              permissionId: permission.id,
            });
            await queryRunner.manager.save(userPermission);
          }
        }
      }

      // Upsert user badges
      if (regularUser) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const earlyAdopterBadge = savedBadges.find(
          (b: Badge) => b.name === 'Early Adopter',
        );
        if (earlyAdopterBadge) {
          const existingBadge = await queryRunner.manager.findOne(UserBadge, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            where: { userId: regularUser.id, badgeId: earlyAdopterBadge.id },
          });

          if (!existingBadge) {
            const userBadge = queryRunner.manager.create(UserBadge, {
              userId: regularUser.id,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              badgeId: earlyAdopterBadge.id,
            });
            await queryRunner.manager.save(userBadge);
          }
        }
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
