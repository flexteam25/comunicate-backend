import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(16, {
    message:
      'Phone number must not exceed 16 characters (E.164 format: +[country code][number], max 15 digits + 1 for +)',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  otp: string;
}
