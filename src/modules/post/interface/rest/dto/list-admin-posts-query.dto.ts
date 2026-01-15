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
  @IsOptional({ message: 'ISPUBLISHED_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISPUBLISHED_MUST_BE_BOOLEAN' })
  isPublished?: boolean;

  @IsOptional({ message: 'ISPOINTBANNER_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISPOINTBANNER_MUST_BE_BOOLEAN' })
  isPointBanner?: boolean;

  @IsOptional({ message: 'CATEGORYID_OPTIONAL' })
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId?: string;

  @IsOptional({ message: 'USERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'USERID_MUST_BE_UUID' })
  userId?: string;

  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;

  @IsOptional({ message: 'SORTBY_OPTIONAL' })
  @IsEnum(PostSortBy, {
    message: 'Sort by must be one of: createdAt, publishedAt, likeCount',
  })
  sortBy?: PostSortBy;

  @IsOptional({ message: 'SORTORDER_OPTIONAL' })
  @IsEnum(SortOrder, { message: 'SORTORDER_INVALID_ENUM' })
  sortOrder?: SortOrder;

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(50, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;
}
