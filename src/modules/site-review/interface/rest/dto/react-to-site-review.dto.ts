import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReactionType } from '../../../domain/entities/site-review-reaction.entity';

export class ReactToSiteReviewDto {
  @IsEnum(ReactionType)
  @IsNotEmpty()
  reactionType: ReactionType;
}
