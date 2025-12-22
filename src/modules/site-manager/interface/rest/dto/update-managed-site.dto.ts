import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateManagedSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Permanent URL must not exceed 500 characters' })
  permanentUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'First charge must be at least 0' })
  @Max(100, { message: 'First charge must be at most 100' })
  firstCharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Recharge must be at least 0' })
  @Max(100, { message: 'Recharge must be at most 100' })
  recharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Experience must be a number' })
  @Min(0, { message: 'Experience must be at least 0' })
  experience?: number;
}
