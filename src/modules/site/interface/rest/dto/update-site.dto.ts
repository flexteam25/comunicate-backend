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
} from 'class-validator';
import { Type } from 'class-transformer';
import { SiteStatus } from '../../../domain/entities/site.entity';

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  permanentUrl?: string;

  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  firstCharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  recharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsString()
  deleteLogo?: string;

  @IsOptional()
  @IsString()
  deleteMainImage?: string;

  @IsOptional()
  @IsString()
  deleteSiteImage?: string;

  @IsOptional()
  @IsArray({ message: 'Partner UIDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each partner UID must be a valid UUID' })
  partnerUid?: string[];

  @IsOptional()
  @IsArray({ message: 'Remove partner UIDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each remove partner UID must be a valid UUID' })
  removePartnerUid?: string[];
}
