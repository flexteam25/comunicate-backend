import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class RequestOtpPhoneDto {
  @IsString({ message: 'PHONE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'PHONE_REQUIRED' })
  @MaxLength(16, {
    message:
      'Phone number must not exceed 16 characters (E.164 format: +[country code][number], max 15 digits + 1 for +)',
  })
  @Matches(/^\+?[1-9]\d{4,14}$/, {
    message:
      'Phone number must be in valid international format (E.164: +[country code][number], min 5 digits, max 15 digits total)',
  })
  phone: string;
}
