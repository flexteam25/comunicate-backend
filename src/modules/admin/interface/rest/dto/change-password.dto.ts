import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class AdminChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  passwordConfirmation: string;

  @IsOptional()
  @IsBoolean()
  logoutAll?: boolean;
}
