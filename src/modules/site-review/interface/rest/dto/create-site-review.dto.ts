import {
  IsString,
  IsNotEmpty,
  IsUUID,
  Min,
  Max,
  IsInt,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSiteReviewDto {
  @IsString({ message: 'SITEID_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SITEID_REQUIRED' })
  siteId: string;

  @Type(() => Number)
  @IsInt({ message: 'RATING_MUST_BE_INTEGER' })
  @Min(1, { message: 'RATING_MIN_VALUE' })
  @Max(5, { message: 'RATING_MAX_VALUE' })
  rating: number;

  @Type(() => Number)
  @IsOptional({ message: 'ODDS_OPTIONAL' })
  @IsInt({ message: 'ODDS_MUST_BE_INTEGER' })
  @Min(1, { message: 'ODDS_MIN_VALUE' })
  @Max(5, { message: 'ODDS_MAX_VALUE' })
  odds?: number;

  @Type(() => Number)
  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(5, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;

  @Type(() => Number)
  @IsOptional({ message: 'EVENT_OPTIONAL' })
  @IsInt({ message: 'EVENT_MUST_BE_INTEGER' })
  @Min(1, { message: 'EVENT_MIN_VALUE' })
  @Max(5, { message: 'EVENT_MAX_VALUE' })
  event?: number;

  @Type(() => Number)
  @IsOptional({ message: 'SPEED_OPTIONAL' })
  @IsInt({ message: 'SPEED_MUST_BE_INTEGER' })
  @Min(1, { message: 'SPEED_MIN_VALUE' })
  @Max(5, { message: 'SPEED_MAX_VALUE' })
  speed?: number;

  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'CONTENT_REQUIRED' })
  content: string;
}
