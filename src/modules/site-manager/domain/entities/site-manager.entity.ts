import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Site } from '../../../site/domain/entities/site.entity';
import { User } from '../../../user/domain/entities/user.entity';

export enum SiteManagerRole {
  MANAGER = 'manager',
  OWNER = 'owner',
}

@Entity('site_managers')
@Index('IDX_site_managers_site_id', ['siteId'])
@Index('IDX_site_managers_user_id', ['userId'])
export class SiteManager {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id', type: 'uuid' })
  siteId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SiteManagerRole.MANAGER,
  })
  role: SiteManagerRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

