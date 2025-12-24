import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPointHistoryQueryDto {
  @IsOptional()
  @IsIn(['all', 'earn', 'spend', 'refund'])
  type?: 'all' | 'earn' | 'spend' | 'refund';

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
