import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ListSiteExchangesQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'completed', 'rejected', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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

