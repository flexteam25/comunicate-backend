import { IsOptional, IsBoolean, IsInt, Min, IsString } from 'class-validator';
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
  @Min(0, { message: 'Points must be greater than or equal to 0' })
  points?: number;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  partner?: boolean;

  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  bio?: string;
}
