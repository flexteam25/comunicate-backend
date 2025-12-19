import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSiteDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  permanentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mainImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  siteImageUrl?: string;

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
}
