import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionType } from '../../../domain/entities/post-reaction.entity';

export class ReactToPostDto {
  @IsEnum(ReactionType, {
    message: 'Reaction type must be either "like" or "dislike"',
  })
  @IsNotEmpty({ message: 'Reaction type is required' })
  reactionType: ReactionType;
}
