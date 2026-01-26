import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

type CreateSiteRequestDtoType = CreateSiteRequestDto;

export class CreateSiteRequestDto {
  @IsNotEmpty({ message: 'NAME_REQUIRED' })
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @ValidateIf(
    (o: CreateSiteRequestDtoType) =>
      o.name !== undefined && o.name !== null && o.name !== '',
  )
  @MaxLength(255, { message: 'NAME_MAX_LENGTH' })
  name: string;

  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'CATEGORYID_REQUIRED' })
  categoryId: string;

  @IsNotEmpty({ message: 'PERMANENTURL_REQUIRED' })
  @IsString({ message: 'PERMANENTURL_MUST_BE_STRING' })
  @ValidateIf(
    (o: CreateSiteRequestDtoType) =>
      o.permanentUrl !== undefined && o.permanentUrl !== null && o.permanentUrl !== '',
  )
  @MaxLength(500, { message: 'PERMANENTURL_MAX_LENGTH' })
  permanentUrl: string;

  @IsNotEmpty({ message: 'ACCESSIBLEURL_REQUIRED' })
  @IsString({ message: 'ACCESSIBLEURL_MUST_BE_STRING' })
  @ValidateIf(
    (o: CreateSiteRequestDtoType) =>
      o.accessibleUrl !== undefined && o.accessibleUrl !== null && o.accessibleUrl !== '',
  )
  @MaxLength(500, { message: 'ACCESSIBLEURL_MAX_LENGTH' })
  accessibleUrl: string;

  @IsNotEmpty({ message: 'CSMESSENGER_REQUIRED' })
  @IsString({ message: 'CSMESSENGER_MUST_BE_STRING' })
  @MaxLength(255, { message: 'CSMESSENGER_MAX_LENGTH' })
  csMessenger: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'FIRSTCHARGE_MUST_BE_NUMBER' })
  @IsNotEmpty({ message: 'FIRSTCHARGE_REQUIRED' })
  @Min(0, { message: 'FIRSTCHARGE_MIN_VALUE' })
  @Max(100, { message: 'FIRSTCHARGE_MAX_VALUE' })
  firstCharge: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'RECHARGE_MUST_BE_NUMBER' })
  @IsNotEmpty({ message: 'RECHARGE_REQUIRED' })
  @Min(0, { message: 'RECHARGE_MIN_VALUE' })
  @Max(100, { message: 'RECHARGE_MAX_VALUE' })
  recharge: number;

  @IsOptional({ message: 'TIERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'TIERID_MUST_BE_UUID' })
  tierId?: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  @MaxLength(500, { message: 'DESCRIPTION_MAX_LENGTH' })
  description?: string;

  @IsOptional({ message: 'EXPERIENCE_OPTIONAL' })
  @Type(() => Number)
  @IsNumber({}, { message: 'EXPERIENCE_MUST_BE_NUMBER' })
  @Min(0, { message: 'EXPERIENCE_MIN_VALUE' })
  experience?: number;
}
