import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum CommentType {
  POST_COMMENT = 'post_comment',
  SITE_REVIEW_COMMENT = 'site_review_comment',
  SCAM_REPORT_COMMENT = 'scam_report_comment',
}

@Entity('user_comments')
@Index('IDX_user_comments_user_id', ['userId'])
@Index('IDX_user_comments_comment_type', ['commentType'])
@Index('IDX_user_comments_comment_id', ['commentId'])
@Index('IDX_user_comments_type_id', ['commentType', 'commentId'])
export class UserComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'comment_type',
    type: 'varchar',
    length: 50,
  })
  commentType: CommentType;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
