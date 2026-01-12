import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'nameKo must be a string' })
  @MaxLength(50, { message: 'nameKo must not exceed 50 characters' })
  nameKo?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'showMain must be a boolean' })
  showMain?: boolean;

  @IsOptional()
  @IsString({ message: 'specialKey must be a string' })
  specialKey?: string;

  @IsNotEmpty({ message: 'Order is required' })
  @Type(() => Number)
  @IsInt({ message: 'Order must be an integer' })
  @Min(1, { message: 'Order must be at least 1' })
  order: number;
}
