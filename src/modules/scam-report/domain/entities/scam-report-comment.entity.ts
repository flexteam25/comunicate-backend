import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { ScamReport } from './scam-report.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { ScamReportCommentImage } from './scam-report-comment-image.entity';

@Entity('scam_report_comments')
@Index('IDX_scam_report_comments_scam_report_id', ['scamReportId'])
export class ScamReportComment extends BaseEntity {
  @Column({ name: 'scam_report_id', type: 'uuid' })
  scamReportId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'has_child', type: 'boolean', default: false })
  hasChild: boolean;

  @ManyToOne(() => ScamReport, (report) => report.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scam_report_id' })
  scamReport: ScamReport;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ScamReportComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: ScamReportComment;

  @OneToMany(() => ScamReportComment, (comment) => comment.parentComment)
  replies: ScamReportComment[];

  @OneToMany(() => ScamReportCommentImage, (image) => image.comment)
  images: ScamReportCommentImage[];
}
