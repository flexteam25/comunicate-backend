import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SiteStatus,
  TetherDepositWithdrawalStatus,
} from '../../../domain/entities/site.entity';
import { IsSlug } from '../../../../../shared/validators/is-slug.validator';

export class UpdateSiteDto {
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

  @ValidateIf((o, v) => v !== undefined)
  @IsString({ message: 'PERMANENTURL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'PERMANENTURL_REQUIRED' })
  @MaxLength(500, { message: 'PERMANENTURL_MAX_LENGTH' })
  permanentUrl?: string;

  @ValidateIf((o, v) => v !== undefined)
  @IsString({ message: 'ACCESSIBLEURL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'ACCESSIBLEURL_REQUIRED' })
  @MaxLength(500, { message: 'ACCESSIBLEURL_MAX_LENGTH' })
  accessibleUrl?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(SiteStatus, { message: 'STATUS_INVALID_ENUM' })
  status?: SiteStatus;

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
  @IsNumber()
  @Min(0, { message: 'EXPERIENCE_MIN_VALUE' })
  experience?: number;

  @IsOptional({ message: 'DELETELOGO_OPTIONAL' })
  @IsString({ message: 'DELETELOGO_MUST_BE_STRING' })
  deleteLogo?: string;

  @IsOptional({ message: 'DELETEMAINIMAGE_OPTIONAL' })
  @IsString({ message: 'DELETEMAINIMAGE_MUST_BE_STRING' })
  deleteMainImage?: string;

  @IsOptional({ message: 'DELETESITEIMAGE_OPTIONAL' })
  @IsString({ message: 'DELETESITEIMAGE_MUST_BE_STRING' })
  deleteSiteImage?: string;

  @IsOptional({ message: 'PARTNERUID_OPTIONAL' })
  @IsArray({ message: 'Partner UIDs must be an array' })
  @IsUUID('4', { each: true, message: 'PARTNERUID_MUST_BE_UUID' })
  partnerUid?: string[];

  @IsOptional({ message: 'REMOVEPARTNERUID_OPTIONAL' })
  @IsArray({ message: 'Remove partner UIDs must be an array' })
  @IsUUID('4', { each: true, message: 'REMOVEPARTNERUID_MUST_BE_UUID' })
  removePartnerUid?: string[];

  @IsOptional({ message: 'TETHERDEPOSITWITHDRAWALSTATUS_OPTIONAL' })
  @IsEnum(TetherDepositWithdrawalStatus, { message: 'TETHERDEPOSITWITHDRAWALSTATUS_INVALID_ENUM' })
  tetherDepositWithdrawalStatus?: TetherDepositWithdrawalStatus;
}
