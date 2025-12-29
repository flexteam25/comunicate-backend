import { IsOptional, IsUUID, IsBoolean, IsString, IsIn } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { Type } from 'class-transformer';

export class ListSiteEventsQueryDto {
  // For user API - filter by siteId (UUID)
  @IsOptional()
  @IsUUID()
  siteId?: string;

  // For admin API - filter by names (LIKE search)
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  adminName?: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['startDate', 'endDate', 'createdAt', 'updatedAt'], {
    message: 'sortBy must be one of: startDate, endDate, createdAt, updatedAt',
  })
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'], { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
