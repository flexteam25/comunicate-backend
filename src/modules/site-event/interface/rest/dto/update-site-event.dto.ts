import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
  IsArray,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class UpdateSiteEventDto {
  @IsOptional({ message: 'TITLE_OPTIONAL' })
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title?: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsOptional({ message: 'STARTDATE_OPTIONAL' })
  @IsDateString({}, { message: 'STARTDATE_MUST_BE_DATE_STRING' })
  startDate?: string;

  @IsOptional({ message: 'ENDDATE_OPTIONAL' })
  @IsDateString({}, { message: 'ENDDATE_MUST_BE_DATE_STRING' })
  endDate?: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsOptional({ message: 'LINKURLS_OPTIONAL' })
  @IsArray({ message: 'Link URLs must be an array' })
  @IsUrl({}, { each: true, message: 'Each link URL must be a valid URL' })
  linkUrls?: string[];

  @IsOptional({ message: 'DELETEBANNERS_OPTIONAL' })
  @IsArray({ message: 'Delete banners must be an array' })
  @IsUUID('4', { each: true, message: 'DELETEBANNERS_MUST_BE_UUID' })
  deleteBanners?: string[];
}
