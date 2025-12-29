import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Site } from '../../../site/domain/entities/site.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';
import { ScamReportImage } from './scam-report-image.entity';
import { ScamReportComment } from './scam-report-comment.entity';
import { ScamReportReaction } from './scam-report-reaction.entity';

export enum ScamReportStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

@Entity('scam_reports')
@Index('IDX_scam_reports_user_id', ['userId'])
@Index('IDX_scam_reports_site_id', ['siteId'])
@Index('IDX_scam_reports_status', ['status'])
@Index('IDX_scam_reports_site_status', ['siteId', 'status'])
export class ScamReport extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId?: string;

  @Column({ name: 'site_url', type: 'varchar', length: 500 })
  siteUrl: string;

  @Column({ name: 'site_name', type: 'varchar', length: 255 })
  siteName: string;

  @Column({ name: 'site_account_info', type: 'text' })
  siteAccountInfo: string;

  @Column({ name: 'registration_url', type: 'varchar', length: 500 })
  registrationUrl: string;

  @Column({ type: 'varchar', length: 255 })
  contact: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount?: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: ScamReportStatus.PENDING,
  })
  status: ScamReportStatus;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Site, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'site_id' })
  site?: Site;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;

  @OneToMany(() => ScamReportImage, (image) => image.scamReport)
  images: ScamReportImage[];

  @OneToMany(() => ScamReportComment, (comment) => comment.scamReport)
  comments: ScamReportComment[];

  @OneToMany(() => ScamReportReaction, (reaction) => reaction.scamReport)
  reactions: ScamReportReaction[];
}
