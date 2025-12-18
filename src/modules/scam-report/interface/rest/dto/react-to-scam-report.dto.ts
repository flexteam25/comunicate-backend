import { IsEnum } from 'class-validator';
import { ReactionType } from '../../../domain/entities/scam-report-reaction.entity';

export class ReactToScamReportDto {
  @IsEnum(ReactionType)
  reactionType: ReactionType;
}
