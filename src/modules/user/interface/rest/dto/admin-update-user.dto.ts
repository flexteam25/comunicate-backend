import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { Type } from 'class-transformer';

export class AdminUpdateUserDto {
  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  points?: number;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  partner?: boolean;
}
