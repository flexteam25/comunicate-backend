import { Type, Transform } from 'class-transformer';
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

export class AdminUpdateScamReportDto {
  @IsOptional({ message: 'SITEID_OPTIONAL' })
  @IsUUID(undefined, { message: 'SITEID_MUST_BE_UUID' })
  siteId?: string;

  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TITLE_REQUIRED' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title: string;

  @IsOptional({ message: 'SITEURL_OPTIONAL' })
  @IsString({ message: 'SITEURL_MUST_BE_STRING' })
  @MaxLength(500, { message: 'SITEURL_MAX_LENGTH' })
  siteUrl?: string;

  @IsOptional({ message: 'SITENAME_OPTIONAL' })
  @IsString({ message: 'SITENAME_MUST_BE_STRING' })
  @MaxLength(255, { message: 'SITENAME_MAX_LENGTH' })
  siteName?: string;

  @IsOptional({ message: 'SITEACCOUNTINFO_OPTIONAL' })
  @IsString({ message: 'SITEACCOUNTINFO_MUST_BE_STRING' })
  siteAccountInfo?: string;

  @IsOptional({ message: 'REGISTRATIONURL_OPTIONAL' })
  @IsString({ message: 'REGISTRATIONURL_MUST_BE_STRING' })
  @MaxLength(500, { message: 'REGISTRATIONURL_MAX_LENGTH' })
  registrationUrl?: string;

  @IsOptional({ message: 'CONTACT_OPTIONAL' })
  @IsString({ message: 'CONTACT_MUST_BE_STRING' })
  @MaxLength(255, { message: 'CONTACT_MAX_LENGTH' })
  contact?: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsOptional({ message: 'AMOUNT_OPTIONAL' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'AMOUNT_MIN_VALUE' })
  amount?: number;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(ScamReportStatus, { message: 'STATUS_INVALID_ENUM' })
  status?: ScamReportStatus;

  @IsOptional({ message: 'DELETEIMAGES_OPTIONAL' })
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
  @IsUUID(4, { each: true, message: 'DELETEIMAGES_MUST_BE_UUID' })
  deleteImages?: string[];
}
