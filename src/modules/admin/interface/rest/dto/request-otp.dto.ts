import { IsEmail } from 'class-validator';

export class AdminRequestOtpDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  email: string;
}
