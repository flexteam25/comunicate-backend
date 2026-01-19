import { IsOptional, IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminListAttendancesQueryDto {
  @IsOptional({ message: 'STARTDATE_OPTIONAL' })
  @IsDateString({}, { message: 'STARTDATE_MUST_BE_DATE' })
  startDate?: string;

  @IsOptional({ message: 'ENDDATE_OPTIONAL' })
  @IsDateString({}, { message: 'ENDDATE_MUST_BE_DATE' })
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

  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;
}
