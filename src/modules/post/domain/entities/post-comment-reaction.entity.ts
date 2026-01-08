import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostComment } from './post-comment.entity';
import { User } from '../../../user/domain/entities/user.entity';
import { ReactionType } from './post-reaction.entity';

@Entity('post_comment_reactions')
@Unique('unique_comment_user_reaction', ['commentId', 'userId'])
@Index('IDX_post_comment_reactions_comment_id', ['commentId'])
@Index('IDX_post_comment_reactions_user_id', ['userId'])
@Index('IDX_post_comment_reactions_type', ['reactionType'])
export class PostCommentReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id', type: 'uuid' })
  commentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'reaction_type', type: 'varchar', length: 10 })
  reactionType: ReactionType;

  @ManyToOne(() => PostComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment: PostComment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
