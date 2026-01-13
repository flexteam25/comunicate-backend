import { IsEmail, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  email: string;

  @IsString({ message: 'PASSWORD_MUST_BE_STRING' })
  password: string;

  @IsOptional({ message: 'DEVICEINFO_OPTIONAL' })
  @IsString({ message: 'DEVICEINFO_MUST_BE_STRING' })
  deviceInfo?: string;
}
