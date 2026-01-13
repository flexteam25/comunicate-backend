import { IsOptional, IsUUID, IsBoolean, IsString, IsIn } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { Type } from 'class-transformer';

export class ListSiteEventsQueryDto {
  // For user API - filter by siteId (UUID or slug)
  @IsOptional({ message: 'SITEID_OPTIONAL' })
  @IsString({ message: 'SITEID_MUST_BE_STRING' })
  siteId?: string;

  // For admin API - filter by names (LIKE search)
  @IsOptional({ message: 'SITENAME_OPTIONAL' })
  @IsString({ message: 'SITENAME_MUST_BE_STRING' })
  siteName?: string;

  @IsOptional({ message: 'USERNAME_OPTIONAL' })
  @IsString({ message: 'USERNAME_MUST_BE_STRING' })
  userName?: string;

  @IsOptional({ message: 'ADMINNAME_OPTIONAL' })
  @IsString({ message: 'ADMINNAME_MUST_BE_STRING' })
  adminName?: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;

  @IsOptional({ message: 'SORTBY_OPTIONAL' })
  @IsString({ message: 'SORTBY_MUST_BE_STRING' })
  @IsIn(['startDate', 'endDate', 'createdAt', 'updatedAt'], {
    message: 'sortBy must be one of: startDate, endDate, createdAt, updatedAt',
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  limit?: number;
}
