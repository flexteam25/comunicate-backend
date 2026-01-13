import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ListRedemptionsQueryDto {
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsString({ message: 'STATUS_MUST_BE_STRING' })
  @IsIn(['pending', 'completed', 'cancelled', 'rejected'])
  status?: string;

  @IsOptional({ message: 'USERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'USERID_MUST_BE_UUID' })
  userId?: string;

  @IsOptional({ message: 'GIFTICONID_OPTIONAL' })
  @IsUUID(undefined, { message: 'GIFTICONID_MUST_BE_UUID' })
  gifticonId?: string;

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
