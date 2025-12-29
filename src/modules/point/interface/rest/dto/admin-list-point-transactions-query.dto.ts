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
  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsIn(['all', 'earn', 'spend', 'refund'])
  type?: 'all' | 'earn' | 'spend' | 'refund';

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string; // UTC date string from FE

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string; // UTC date string from FE

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
