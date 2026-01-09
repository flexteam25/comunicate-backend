import { IsString, IsOptional, MaxLength, IsBoolean, ValidateIf } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name?: string;

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
  @ValidateIf((o) => o.specialKey !== null)
  @IsString({ message: 'specialKey must be a string' })
  specialKey?: string | null;
}
