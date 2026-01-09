import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  verifyCode: string;
}
