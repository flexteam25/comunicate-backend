import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
  ValidateIf,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional({ message: 'SHOWMAIN_OPTIONAL' })
  @IsBoolean({ message: 'SHOWMAIN_MUST_BE_BOOLEAN' })
  showMain?: boolean;

  @IsOptional({ message: 'ISPOINTBANNER_OPTIONAL' })
  @IsBoolean({ message: 'ISPOINTBANNER_MUST_BE_BOOLEAN' })
  isPointBanner?: boolean;

  @IsOptional({ message: 'SPECIALKEY_OPTIONAL' })
  @ValidateIf((o) => o.specialKey !== null)
  @IsString({ message: 'SPECIALKEY_MUST_BE_STRING' })
  specialKey?: string | null;

  @IsOptional({ message: 'ORDER_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'ORDER_MUST_BE_INTEGER' })
  @Min(1, { message: 'ORDER_MIN_VALUE' })
  order?: number;

  @IsNotEmpty({ message: 'ADMINCREATEONLY_REQUIRED' })
  @Type(() => Boolean)
  @IsBoolean({ message: 'ADMINCREATEONLY_MUST_BE_BOOLEAN' })
  adminCreateOnly: boolean;
}
