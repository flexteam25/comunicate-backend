import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';

export class ReactToCommentDto {
  @IsNotEmpty()
  @IsEnum(ReactionType)
  reactionType: ReactionType;
}
