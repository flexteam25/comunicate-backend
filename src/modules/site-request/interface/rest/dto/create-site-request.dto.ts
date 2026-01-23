import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSiteRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  name: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Permanent URL must not exceed 500 characters' })
  permanentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'First charge must be a number' })
  @Min(0, { message: 'First charge must be at least 0' })
  @Max(100, { message: 'First charge must not exceed 100' })
  firstCharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Recharge must be a number' })
  @Min(0, { message: 'Recharge must be at least 0' })
  @Max(100, { message: 'Recharge must not exceed 100' })
  recharge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Experience must be a number' })
  @Min(0, { message: 'Experience must be at least 0' })
  experience?: number;
}
