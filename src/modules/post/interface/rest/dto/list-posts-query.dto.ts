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
  @IsOptional()
  @IsUUID()
  categoryId?: string;

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
