import { IsEmail, IsString, IsOptional } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
