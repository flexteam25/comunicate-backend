import { IsString, IsOptional, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSiteReviewDto {
  @IsOptional({ message: 'RATING_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'RATING_MUST_BE_INTEGER' })
  @Min(1, { message: 'RATING_MIN_VALUE' })
  @Max(5, { message: 'RATING_MAX_VALUE' })
  rating?: number;

  @IsOptional({ message: 'ODDS_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'ODDS_MUST_BE_INTEGER' })
  @Min(1, { message: 'ODDS_MIN_VALUE' })
  @Max(5, { message: 'ODDS_MAX_VALUE' })
  odds?: number;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(5, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;

  @IsOptional({ message: 'EVENT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'EVENT_MUST_BE_INTEGER' })
  @Min(1, { message: 'EVENT_MIN_VALUE' })
  @Max(5, { message: 'EVENT_MAX_VALUE' })
  event?: number;

  @IsOptional({ message: 'SPEED_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'SPEED_MUST_BE_INTEGER' })
  @Min(1, { message: 'SPEED_MIN_VALUE' })
  @Max(5, { message: 'SPEED_MAX_VALUE' })
  speed?: number;

  @IsOptional({ message: 'CONTENT_OPTIONAL' })
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  content?: string;
}
