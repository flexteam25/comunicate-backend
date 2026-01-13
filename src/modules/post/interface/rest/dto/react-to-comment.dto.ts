import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';

export class ReactToCommentDto {
  @IsNotEmpty({ message: 'REACTIONTYPE_REQUIRED' })
  @IsEnum(ReactionType, { message: 'REACTIONTYPE_INVALID_ENUM' })
  reactionType: ReactionType;
}
