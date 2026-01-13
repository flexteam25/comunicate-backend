import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpForgotPasswordDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  @IsNotEmpty({ message: 'EMAIL_REQUIRED' })
  email: string;

  @IsString({ message: 'VERIFYCODE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'VERIFYCODE_REQUIRED' })
  @Matches(/^\d{6}$/, { message: 'Verification code must be 6 digits' })
  verifyCode: string;
}
