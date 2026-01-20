import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';

export class ListApplicationsQueryDto {
  @IsOptional({ message: 'SITENAME_OPTIONAL' })
  @IsString({ message: 'SITENAME_MUST_BE_STRING' })
  siteName?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsEnum(SiteManagerApplicationStatus, {
    message: 'STATUS_INVALID_ENUM',
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
