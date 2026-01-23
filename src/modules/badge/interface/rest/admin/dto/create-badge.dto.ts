import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BadgeType } from '../../../../domain/entities/badge.entity';
import { TransformToBoolean } from '../../../../../../shared/utils/transform-boolean.util';

export class CreateBadgeDto {
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'NAME_REQUIRED' })
  name: string;

  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  description?: string;

  @IsString({ message: 'ICONURL_MUST_BE_STRING' })
  @IsOptional({ message: 'ICONURL_OPTIONAL' })
  iconUrl?: string;

  @IsString({ message: 'ICONNAME_MUST_BE_STRING' })
  @IsOptional({ message: 'ICONNAME_OPTIONAL' })
  iconName?: string;

  @IsEnum(BadgeType, { message: 'BADGETYPE_INVALID_ENUM' })
  @IsNotEmpty({ message: 'BADGETYPE_REQUIRED' })
  badgeType: BadgeType;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsString({ message: 'OBTAIN_MUST_BE_STRING' })
  @IsOptional({ message: 'OBTAIN_OPTIONAL' })
  obtain?: string;

  @IsOptional({ message: 'POINT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'POINT_MUST_BE_INTEGER' })
  @Min(0, { message: 'POINT_MIN_VALUE' })
  @Max(100000, { message: 'POINT_MAX_VALUE' })
  point?: number;

  @IsString({ message: 'COLOR_MUST_BE_STRING' })
  @IsOptional({ message: 'COLOR_OPTIONAL' })
  color?: string;

  @IsNotEmpty({ message: 'ORDER_REQUIRED' })
  @Type(() => Number)
  @IsInt({ message: 'ORDER_MUST_BE_INTEGER' })
  @Min(1, { message: 'ORDER_MIN_VALUE' })
  order: number;
}
