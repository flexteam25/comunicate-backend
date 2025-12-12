import { IsEmail } from 'class-validator';

export class AdminRequestOtpDto {
  @IsEmail()
  email: string;
}

