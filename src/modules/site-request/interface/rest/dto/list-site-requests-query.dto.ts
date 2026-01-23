import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { SiteRequestStatus } from '../../../domain/entities/site-request.entity';

export class ListSiteRequestsQueryDto {
  @IsOptional()
  @IsEnum(SiteRequestStatus, {
    message: 'Status must be one of: pending, approved, rejected, cancelled',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  status?: SiteRequestStatus;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  userName?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  startDate?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  endDate?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit must not exceed 50' })
  limit?: number;
}
