import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';
import { Badge } from '../../../badge/domain/entities/badge.entity';
import { UserBadgeRequestImage } from './user-badge-request-image.entity';

export enum UserBadgeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('user_badge_requests')
@Index('IDX_user_badge_requests_user_id', ['userId'])
@Index('IDX_user_badge_requests_badge_id', ['badgeId'])
@Index('IDX_user_badge_requests_status', ['status'])
@Index('IDX_user_badge_requests_user_badge_status', ['userId', 'badgeId', 'status'])
export class UserBadgeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserBadgeRequestStatus.PENDING,
  })
  status: UserBadgeRequestStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @OneToMany(() => UserBadgeRequestImage, (image) => image.request, { cascade: true })
  images?: UserBadgeRequestImage[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Badge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge: Badge;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
