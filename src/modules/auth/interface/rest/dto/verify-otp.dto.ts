import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString({ message: 'PHONE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'PHONE_REQUIRED' })
  @MaxLength(16, {
    message:
      'Phone number must not exceed 16 characters (E.164 format: +[country code][number], max 15 digits + 1 for +)',
  })
  phone: string;

  @IsString({ message: 'OTP_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'OTP_REQUIRED' })
  @MaxLength(10, { message: 'OTP_MAX_LENGTH' })
  otp: string;
}
