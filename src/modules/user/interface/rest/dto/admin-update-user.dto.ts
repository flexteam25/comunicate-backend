import { IsOptional, IsBoolean, IsInt, Min, IsString } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { Type } from 'class-transformer';

export class AdminUpdateUserDto {
  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsOptional({ message: 'POINTS_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'POINTS_MUST_BE_INTEGER' })
  @Min(0, { message: 'POINTS_MIN_VALUE' })
  points?: number;

  @IsOptional({ message: 'PARTNER_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'PARTNER_MUST_BE_BOOLEAN' })
  partner?: boolean;

  @IsOptional({ message: 'BIO_OPTIONAL' })
  @IsString({ message: 'BIO_MUST_BE_STRING' })
  bio?: string;
}
