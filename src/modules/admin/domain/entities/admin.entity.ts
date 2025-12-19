import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { AdminToken } from './admin-token.entity';
import { AdminRole } from './admin-role.entity';
import { AdminPermission } from './admin-permission.entity';
import { AdminOldPassword } from '../../../user/domain/entities/admin-old-password.entity';

@Entity('admins')
export class Admin extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  displayName?: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_super_admin', type: 'boolean', default: false })
  isSuperAdmin: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => AdminToken, (token) => token.admin)
  tokens: AdminToken[];

  @OneToMany(() => AdminRole, (adminRole) => adminRole.admin)
  adminRoles: AdminRole[];

  @OneToMany(() => AdminPermission, (adminPermission) => adminPermission.admin)
  adminPermissions: AdminPermission[];

  @OneToMany(() => AdminOldPassword, (oldPassword) => oldPassword.admin)
  oldPasswords: AdminOldPassword[];
}
