import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';

@Entity('bug_reports')
export class BugReport extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', array: true, nullable: true })
  images?: string[];

  @Column({ name: 'is_viewed', type: 'boolean', default: false })
  isViewed: boolean;

  @Column({ name: 'viewed_by_admin_id', type: 'uuid', nullable: true })
  viewedByAdminId?: string;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: 'viewed_by_admin_id' })
  viewedByAdmin?: Admin;

  @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
  viewedAt?: Date;
}
