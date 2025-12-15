import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { UserBadge } from '../../../user/domain/entities/user-badge.entity';

export enum BadgeType {
  USER = 'user',
  SITE = 'site',
}

@Entity('badges')
export class Badge extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 500, nullable: true })
  iconUrl?: string;

  @Column({
    name: 'badge_type',
    type: 'varchar',
    length: 20,
    default: BadgeType.USER,
  })
  badgeType: BadgeType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
  userBadges: UserBadge[];
}
