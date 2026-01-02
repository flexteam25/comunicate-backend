import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  partner?: boolean;
}
