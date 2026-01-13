import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class UpdateCategoryDto {
  @IsOptional({ message: 'NAME_OPTIONAL' })
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @MaxLength(50, { message: 'NAME_MAX_LENGTH' })
  name?: string;

  @IsOptional({ message: 'NAMEKO_OPTIONAL' })
  @IsString({ message: 'NAMEKO_MUST_BE_STRING' })
  @MaxLength(50, { message: 'NAMEKO_MAX_LENGTH' })
  nameKo?: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;
}
