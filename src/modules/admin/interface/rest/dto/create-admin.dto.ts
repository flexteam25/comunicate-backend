import { IsEmail, IsString, MinLength, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  permissionIds?: string[];
}

