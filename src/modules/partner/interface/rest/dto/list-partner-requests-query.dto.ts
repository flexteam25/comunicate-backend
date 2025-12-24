import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PartnerRequestStatus } from '../../../domain/entities/partner-request.entity';

export class ListPartnerRequestsQueryDto {
  @IsOptional()
  @IsEnum(PartnerRequestStatus, {
    message: 'Status must be one of: pending, approved, rejected',
  })
  status?: PartnerRequestStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;
}
