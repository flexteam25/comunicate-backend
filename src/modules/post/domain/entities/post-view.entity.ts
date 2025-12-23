import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/base-entity';
import { Post } from './post.entity';
import { User } from '../../../user/domain/entities/user.entity';

@Entity('post_views')
@Index('IDX_post_views_post_id', ['postId'])
@Index('IDX_post_views_user_id', ['userId'])
@Index('IDX_post_views_created_at', ['createdAt'])
export class PostView extends BaseEntity {
  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @ManyToOne(() => Post, (post) => post.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
