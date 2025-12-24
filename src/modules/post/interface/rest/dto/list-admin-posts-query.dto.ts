import {
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { PostSortBy, SortOrder } from './list-posts-query.dto';

export class ListAdminPostsQueryDto {
  @IsOptional()
  @TransformToBoolean
  @IsBoolean({ message: 'Is published must be a boolean' })
  isPublished?: boolean;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @IsEnum(PostSortBy, {
    message: 'Sort by must be one of: createdAt, publishedAt, likeCount',
  })
  sortBy?: PostSortBy;

  @IsOptional()
  @IsEnum(SortOrder, { message: 'Sort order must be ASC or DESC' })
  sortOrder?: SortOrder;

  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit must be at most 50' })
  limit?: number;
}
