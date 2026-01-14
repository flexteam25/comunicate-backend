import { IsString, IsOptional, IsInt, Min, MaxLength, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class UpdateTierDto {
  @IsOptional({ message: 'NAME_OPTIONAL' })
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @MaxLength(10, { message: 'NAME_MAX_LENGTH' })
  name?: string;

  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsOptional({ message: 'ORDER_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'ORDER_MUST_BE_INTEGER' })
  @Min(1, { message: 'ORDER_MIN_VALUE' })
  order?: number;

  @IsOptional({ message: 'ICONURL_OPTIONAL' })
  @IsString({ message: 'ICONURL_MUST_BE_STRING' })
  @MaxLength(500, { message: 'ICONURL_MAX_LENGTH' })
  iconUrl?: string;

  @IsOptional({ message: 'ICONNAME_OPTIONAL' })
  @IsString({ message: 'ICONNAME_MUST_BE_STRING' })
  @MaxLength(255, { message: 'ICONNAME_MAX_LENGTH' })
  iconName?: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;
}
