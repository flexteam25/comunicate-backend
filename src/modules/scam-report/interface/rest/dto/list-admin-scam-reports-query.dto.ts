import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ScamReportStatus } from '../../../domain/entities/scam-report.entity';

export class ListAdminScamReportsQueryDto {
  @IsOptional()
  @IsEnum(ScamReportStatus)
  status?: ScamReportStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
