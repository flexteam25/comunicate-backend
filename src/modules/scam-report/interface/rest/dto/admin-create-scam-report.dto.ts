import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ScamReportStatus } from '../../../domain/entities/scam-report.entity';

export class AdminCreateScamReportDto {
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  siteUrl: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  siteName: string;

  @IsString()
  @IsNotEmpty()
  siteAccountInfo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  registrationUrl: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contact: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(ScamReportStatus)
  status?: ScamReportStatus;
}
