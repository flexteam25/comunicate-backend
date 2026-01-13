import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestOtpDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  @IsNotEmpty({ message: 'EMAIL_REQUIRED' })
  email: string;
}
