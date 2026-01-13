import { IsOptional, IsUUID, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum PostSortBy {
  CREATED_AT = 'createdAt',
  PUBLISHED_AT = 'publishedAt',
  LIKE_COUNT = 'likeCount',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ListPostsQueryDto {
  @IsOptional({ message: 'CATEGORYID_OPTIONAL' })
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId?: string;

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
