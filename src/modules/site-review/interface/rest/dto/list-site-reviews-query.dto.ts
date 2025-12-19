import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListSiteReviewsQueryDto {
  @IsUUID()
  @IsNotEmpty()
  siteId: string;

  @IsOptional()
  @IsEnum(['createdAt', 'rating'])
  sortBy?: 'createdAt' | 'rating';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
