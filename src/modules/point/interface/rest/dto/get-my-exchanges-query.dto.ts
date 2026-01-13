import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMyExchangesQueryDto {
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsString({ message: 'STATUS_MUST_BE_STRING' })
  @IsIn(['pending', 'processing', 'completed', 'rejected', 'cancelled'])
  status?: string;

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
