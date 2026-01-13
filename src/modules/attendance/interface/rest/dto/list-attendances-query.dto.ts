import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum AttendanceFilter {
  TODAY = 'today',
  STREAK = 'streak',
  TOTAL = 'total',
}

export class ListAttendancesQueryDto {
  @IsEnum(AttendanceFilter, {
    message: 'Filter must be one of: today, streak, total',
  })
  @IsOptional({ message: 'FILTER_OPTIONAL' })
  filter: AttendanceFilter;

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
