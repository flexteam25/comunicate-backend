import {
  IsOptional,
  IsIn,
  IsString,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminListPointTransactionsQueryDto {
  @IsOptional({ message: 'USERNAME_OPTIONAL' })
  @IsString({ message: 'USERNAME_MUST_BE_STRING' })
  userName?: string;

  @IsOptional()
  @IsIn(['all', 'earn', 'spend', 'refund'])
  type?: 'all' | 'earn' | 'spend' | 'refund';

  @IsOptional({ message: 'STARTDATE_OPTIONAL' })
  @IsDateString({}, { message: 'STARTDATE_MUST_BE_DATE_STRING' })
  startDate?: string; // UTC date string from FE

  @IsOptional({ message: 'ENDDATE_OPTIONAL' })
  @IsDateString({}, { message: 'ENDDATE_MUST_BE_DATE_STRING' })
  endDate?: string; // UTC date string from FE

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
