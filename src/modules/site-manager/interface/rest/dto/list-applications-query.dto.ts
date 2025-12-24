import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';

export class ListApplicationsQueryDto {
  @IsOptional()
  @IsString({ message: 'Site name must be a string' })
  siteName?: string;

  @IsOptional()
  @IsEnum(SiteManagerApplicationStatus, {
    message: 'Status must be one of: pending, approved, rejected',
  })
  status?: SiteManagerApplicationStatus;

  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;
}
