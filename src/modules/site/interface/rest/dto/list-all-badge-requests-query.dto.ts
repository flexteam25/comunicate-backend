import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SiteBadgeRequestStatus } from '../../../domain/entities/site-badge-request.entity';

export class ListAllBadgeRequestsQueryDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  badgeName?: string;

  @IsOptional()
  @IsEnum(SiteBadgeRequestStatus)
  status?: SiteBadgeRequestStatus;

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
