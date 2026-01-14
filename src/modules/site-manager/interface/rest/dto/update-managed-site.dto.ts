import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSlug } from '../../../../../shared/validators/is-slug.validator';

export class UpdateManagedSiteDto {
  @IsOptional({ message: 'NAME_OPTIONAL' })
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @MaxLength(255, { message: 'NAME_MAX_LENGTH' })
  name?: string;

  @IsOptional({ message: 'SLUG_OPTIONAL' })
  @IsString({ message: 'SLUG_MUST_BE_STRING' })
  @MaxLength(50, { message: 'SLUG_MAX_LENGTH' })
  @IsSlug()
  slug?: string;

  @IsOptional({ message: 'CATEGORYID_OPTIONAL' })
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId?: string;

  @IsOptional({ message: 'TIERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'TIERID_MUST_BE_UUID' })
  tierId?: string;

  @IsString({ message: 'PERMANENTURL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'PERMANENTURL_REQUIRED' })
  @MaxLength(500, { message: 'PERMANENTURL_MAX_LENGTH' })
  permanentUrl: string;

  @IsString({ message: 'ACCESSIBLEURL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'ACCESSIBLEURL_REQUIRED' })
  @MaxLength(500, { message: 'ACCESSIBLEURL_MAX_LENGTH' })
  accessibleUrl: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsOptional({ message: 'FIRSTCHARGE_OPTIONAL' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'FIRSTCHARGE_MIN_VALUE' })
  @Max(100, { message: 'FIRSTCHARGE_MAX_VALUE' })
  firstCharge?: number;

  @IsOptional({ message: 'RECHARGE_OPTIONAL' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'RECHARGE_MIN_VALUE' })
  @Max(100, { message: 'RECHARGE_MAX_VALUE' })
  recharge?: number;

  @IsOptional({ message: 'EXPERIENCE_OPTIONAL' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Experience must be a number' })
  @Min(0, { message: 'EXPERIENCE_MIN_VALUE' })
  experience?: number;

  @IsOptional()
  @IsString({ message: 'Delete logo flag must be a string' })
  @IsIn(['true', 'false'], { message: 'Delete logo flag must be "true" or "false"' })
  deleteLogo?: 'true' | 'false';

  @IsOptional()
  @IsString({ message: 'Delete main image flag must be a string' })
  @IsIn(['true', 'false'], {
    message: 'Delete main image flag must be "true" or "false"',
  })
  deleteMainImage?: 'true' | 'false';

  @IsOptional()
  @IsString({ message: 'Delete site image flag must be a string' })
  @IsIn(['true', 'false'], {
    message: 'Delete site image flag must be "true" or "false"',
  })
  deleteSiteImage?: 'true' | 'false';
}
