import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListSiteReviewsQueryDto {
  @IsString({ message: 'SITEID_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SITEID_REQUIRED' })
  siteId: string;

  @IsOptional()
  @IsEnum(['createdAt', 'rating'])
  sortBy?: 'createdAt' | 'rating';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'CURSOR_INVALID_ENUM' })
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(50, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;

  @IsOptional({ message: 'RATING_OPTIONAL' })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'RATING_MIN_VALUE' })
  @Max(5, { message: 'RATING_MAX_VALUE' })
  rating?: number;

  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;
}
