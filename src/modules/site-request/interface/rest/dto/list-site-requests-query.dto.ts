import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { SiteRequestStatus } from '../../../domain/entities/site-request.entity';

export class ListSiteRequestsQueryDto {
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(SiteRequestStatus, {
    message: 'STATUS_INVALID_ENUM',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  status?: SiteRequestStatus;

  @IsOptional({ message: 'USERNAME_OPTIONAL' })
  @IsString({ message: 'USERNAME_MUST_BE_STRING' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  userName?: string;

  @IsOptional({ message: 'STARTDATE_OPTIONAL' })
  @IsString({ message: 'STARTDATE_MUST_BE_STRING' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  startDate?: string;

  @IsOptional({ message: 'ENDDATE_OPTIONAL' })
  @IsString({ message: 'ENDDATE_MUST_BE_STRING' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  endDate?: string;

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
