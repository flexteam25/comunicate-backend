import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionType } from '../../../domain/entities/site-review-reaction.entity';

export class ReactToSiteReviewDto {
  @IsEnum(ReactionType, { message: 'REACTIONTYPE_INVALID_ENUM' })
  @IsNotEmpty({ message: 'REACTIONTYPE_REQUIRED' })
  reactionType: ReactionType;
}
