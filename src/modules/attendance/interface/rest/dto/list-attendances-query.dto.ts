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
  @IsOptional()
  filter: AttendanceFilter;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
