import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMyExchangesQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'completed', 'rejected', 'cancelled'])
  status?: string;

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
