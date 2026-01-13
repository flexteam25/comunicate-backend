import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class ChangePasswordDto {
  @IsString({ message: 'CURRENTPASSWORD_MUST_BE_STRING' })
  currentPassword: string;

  @IsString({ message: 'NEWPASSWORD_MUST_BE_STRING' })
  @MinLength(8, { message: 'NEWPASSWORD_MIN_LENGTH' })
  newPassword: string;

  @IsString({ message: 'PASSWORDCONFIRMATION_MUST_BE_STRING' })
  @MinLength(8, { message: 'PASSWORDCONFIRMATION_MIN_LENGTH' })
  passwordConfirmation: string;

  @IsOptional({ message: 'LOGOUTALL_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'LOGOUTALL_MUST_BE_BOOLEAN' })
  logoutAll?: boolean;
}
