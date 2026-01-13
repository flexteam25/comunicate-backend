import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { User } from './user.entity';
import { Post } from '../../../post/domain/entities/post.entity';

@Entity('user_posts')
@Index('IDX_user_posts_user_id', ['userId'])
@Index('IDX_user_posts_post_id', ['postId'])
@Unique('UQ_user_posts_user_post', ['userId', 'postId'])
export class UserPost extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
