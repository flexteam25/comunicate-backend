import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  passwordConfirmation: string;

  @IsString()
  verifyCode: string;
}
