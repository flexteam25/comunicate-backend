import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ScamReportComment } from './scam-report-comment.entity';

@Entity('scam_report_comment_images')
@Index('IDX_scam_report_comment_images_comment_id', ['commentId'])
export class ScamReportCommentImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ type: 'integer', default: 0 })
  order: number;

  @ManyToOne(() => ScamReportComment, (comment) => comment.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: ScamReportComment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

