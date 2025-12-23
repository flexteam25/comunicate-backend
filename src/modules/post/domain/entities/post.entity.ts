import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from '../../../user/domain/entities/user.entity';
import { Admin } from '../../../admin/domain/entities/admin.entity';
import { PostCategory } from './post-category.entity';
import { PostComment } from './post-comment.entity';
import { PostReaction } from './post-reaction.entity';
import { PostView } from './post-view.entity';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('posts')
@Index('IDX_posts_category_id', ['categoryId'])
@Index('IDX_posts_user_id', ['userId'])
@Index('IDX_posts_admin_id', ['adminId'])
@Index('IDX_posts_is_published', ['isPublished'])
@Index('IDX_posts_published_at', ['publishedAt'])
@Index('IDX_posts_is_pinned', ['isPinned'])
export class Post extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'thumbnail_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  thumbnailUrl?: string;

  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin;

  @ManyToOne(() => PostCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: PostCategory;

  @OneToMany(() => PostComment, (comment) => comment.post)
  comments: PostComment[];

  @OneToMany(() => PostReaction, (reaction) => reaction.post)
  reactions: PostReaction[];

  @OneToMany(() => PostView, (view) => view.post)
  views: PostView[];

  // Computed properties
  likeCount?: number;
  dislikeCount?: number;
  commentCount?: number;
  viewCount?: number;
}
