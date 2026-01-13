import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsDateString,
  MaxLength,
  IsArray,
  IsUrl,
} from 'class-validator';

export class CreateSiteEventDto {
  @IsUUID(undefined, { message: 'SITEID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'SITEID_REQUIRED' })
  siteId: string;

  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TITLE_REQUIRED' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsDateString({}, { message: 'STARTDATE_MUST_BE_DATE_STRING' })
  @IsNotEmpty({ message: 'STARTDATE_REQUIRED' })
  startDate: string;

  @IsDateString({}, { message: 'ENDDATE_MUST_BE_DATE_STRING' })
  @IsNotEmpty({ message: 'ENDDATE_REQUIRED' })
  endDate: string;

  @IsOptional({ message: 'LINKURLS_OPTIONAL' })
  @IsArray({ message: 'Link URLs must be an array' })
  @IsUrl({}, { each: true, message: 'Each link URL must be a valid URL' })
  linkUrls?: string[];
}
