import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class AdminChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  passwordConfirmation: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  logoutAll?: boolean;
}
