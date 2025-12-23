import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from './post.entity';
import { User } from '../../../user/domain/entities/user.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

@Entity('post_reactions')
@Unique('unique_post_user_reaction', ['postId', 'userId'])
@Index('IDX_post_reactions_post_id', ['postId'])
@Index('IDX_post_reactions_user_id', ['userId'])
@Index('IDX_post_reactions_type', ['reactionType'])
export class PostReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'reaction_type', type: 'varchar', length: 10 })
  reactionType: ReactionType;

  @ManyToOne(() => Post, (post) => post.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
