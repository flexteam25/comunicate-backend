import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'showMain must be a boolean' })
  showMain?: boolean;
}
