import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';

export class ListMyApplicationsQueryDto {
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(SiteManagerApplicationStatus, {
    message: 'Status must be one of: pending, approved, rejected',
  })
  status?: SiteManagerApplicationStatus;

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(100, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;
}
