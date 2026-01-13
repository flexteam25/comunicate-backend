import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScamReportDto {
  @IsOptional({ message: 'SITEID_OPTIONAL' })
  @IsUUID(undefined, { message: 'SITEID_MUST_BE_UUID' })
  siteId?: string;

  @IsString({ message: 'SITEURL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SITEURL_REQUIRED' })
  @MaxLength(500, { message: 'SITEURL_MAX_LENGTH' })
  siteUrl: string;

  @IsString({ message: 'SITENAME_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SITENAME_REQUIRED' })
  @MaxLength(255, { message: 'SITENAME_MAX_LENGTH' })
  siteName: string;

  @IsString({ message: 'SITEACCOUNTINFO_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SITEACCOUNTINFO_REQUIRED' })
  siteAccountInfo: string;

  @IsString({ message: 'REGISTRATIONURL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'REGISTRATIONURL_REQUIRED' })
  @MaxLength(500, { message: 'REGISTRATIONURL_MAX_LENGTH' })
  registrationUrl: string;

  @IsString({ message: 'CONTACT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'CONTACT_REQUIRED' })
  @MaxLength(255, { message: 'CONTACT_MAX_LENGTH' })
  contact: string;

  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'DESCRIPTION_REQUIRED' })
  description: string;

  @IsOptional({ message: 'AMOUNT_OPTIONAL' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'AMOUNT_MIN_VALUE' })
  amount?: number;
}
