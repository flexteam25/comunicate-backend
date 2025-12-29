import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ScamReportStatus } from '../../../domain/entities/scam-report.entity';

export class AdminUpdateScamReportDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  siteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  siteName?: string;

  @IsOptional()
  @IsString()
  siteAccountInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  registrationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(ScamReportStatus)
  status?: ScamReportStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  deleteImages?: string[];
}
