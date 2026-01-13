import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PartnerRequestStatus } from '../../../domain/entities/partner-request.entity';

export class ListPartnerRequestsQueryDto {
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(PartnerRequestStatus, {
    message: 'Status must be one of: pending, approved, rejected',
  })
  status?: PartnerRequestStatus;

  @IsOptional({ message: 'USERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'USERID_MUST_BE_UUID' })
  userId?: string;

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(100, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;
}
