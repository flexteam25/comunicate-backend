import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { Post } from './post.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { PostCommentImage } from './post-comment-image.entity';

@Entity('post_comments')
@Index('IDX_post_comments_post_id', ['postId'])
@Index('IDX_post_comments_user_id', ['userId'])
@Index('IDX_post_comments_parent_id', ['parentCommentId'])
@Index('IDX_post_comments_created_at', ['createdAt'])
export class PostComment extends BaseEntity {
  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true })
  parentCommentId?: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'has_child', type: 'boolean', default: false })
  hasChild: boolean;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => PostComment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_comment_id' })
  parentComment?: PostComment;

  @OneToMany(() => PostComment, (comment) => comment.parentComment)
  replies: PostComment[];

  @OneToMany(() => PostCommentImage, (image) => image.comment, { cascade: true })
  images: PostCommentImage[];

  // Computed properties
  likeCount?: number;
  dislikeCount?: number;
  reacted?: string | null; // 'like', 'dislike', or null
}
