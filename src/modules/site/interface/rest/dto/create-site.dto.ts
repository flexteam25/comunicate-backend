import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSlug } from '../../../../../shared/validators/is-slug.validator';
import { TetherDepositWithdrawalStatus } from '../../../domain/entities/site.entity';

export class CreateSiteDto {
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @MaxLength(255, { message: 'NAME_MAX_LENGTH' })
  name: string;

  @IsString({ message: 'SLUG_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SLUG_REQUIRED' })
  @MaxLength(50, { message: 'SLUG_MAX_LENGTH' })
  @IsSlug()
  slug: string;

  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId: string;

  @IsOptional({ message: 'TIERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'TIERID_MUST_BE_UUID' })
  tierId?: string;

  @IsOptional({ message: 'PERMANENTURL_OPTIONAL' })
  @IsString({ message: 'PERMANENTURL_MUST_BE_STRING' })
  @MaxLength(500, { message: 'PERMANENTURL_MAX_LENGTH' })
  permanentUrl?: string;

  @IsOptional({ message: 'MAINIMAGEURL_OPTIONAL' })
  @IsString({ message: 'MAINIMAGEURL_MUST_BE_STRING' })
  @MaxLength(500, { message: 'MAINIMAGEURL_MAX_LENGTH' })
  mainImageUrl?: string;

  @IsOptional({ message: 'SITEIMAGEURL_OPTIONAL' })
  @IsString({ message: 'SITEIMAGEURL_MUST_BE_STRING' })
  @MaxLength(500, { message: 'SITEIMAGEURL_MAX_LENGTH' })
  siteImageUrl?: string;

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

  @IsOptional({ message: 'PARTNERUID_OPTIONAL' })
  @IsUUID(undefined, { message: 'PARTNERUID_MUST_BE_UUID' })
  partnerUid?: string;

  @IsOptional({ message: 'TETHERDEPOSITWITHDRAWALSTATUS_OPTIONAL' })
  @IsEnum(TetherDepositWithdrawalStatus, { message: 'TETHERDEPOSITWITHDRAWALSTATUS_INVALID_ENUM' })
  tetherDepositWithdrawalStatus?: TetherDepositWithdrawalStatus;
}
