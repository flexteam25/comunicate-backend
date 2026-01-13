import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @MaxLength(50, { message: 'NAME_MAX_LENGTH' })
  name: string;

  @IsOptional({ message: 'NAMEKO_OPTIONAL' })
  @IsString({ message: 'NAMEKO_MUST_BE_STRING' })
  @MaxLength(50, { message: 'NAMEKO_MAX_LENGTH' })
  nameKo?: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;
}
