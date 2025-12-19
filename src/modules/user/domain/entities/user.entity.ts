import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { UserToken } from '../../../auth/domain/entities/user-token.entity';
import { UserRole } from './user-role.entity';
import { UserPermission } from './user-permission.entity';
import { UserBadge } from './user-badge.entity';
import { UserProfile } from './user-profile.entity';
import { UserFavoriteSite } from './user-favorite-site.entity';
import { UserHistorySite } from './user-history-site.entity';

@Entity('users')
export class User extends BaseEntity {
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

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => UserToken, (token) => token.user)
  tokens: UserToken[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => UserPermission, (userPermission) => userPermission.user)
  userPermissions: UserPermission[];

  @OneToMany(() => UserBadge, (userBadge) => userBadge.user)
  userBadges: UserBadge[];

  @OneToMany(() => UserFavoriteSite, (favorite) => favorite.user)
  userFavoriteSites: UserFavoriteSite[];

  @OneToMany(() => UserHistorySite, (history) => history.user)
  userHistorySites: UserHistorySite[];

  @OneToOne(() => UserProfile, (userProfile) => userProfile.user, {
    cascade: true,
  })
  userProfile: UserProfile;
}
