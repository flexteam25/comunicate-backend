import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { UserBadgeRequestStatus } from '../../../domain/entities/user-badge-request.entity';

export class ListUserBadgeRequestsQueryDto {
  @IsOptional()
  @IsEnum(UserBadgeRequestStatus)
  status?: UserBadgeRequestStatus;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  badgeName?: string;

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
