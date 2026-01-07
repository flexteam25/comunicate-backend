import { IsDate, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16, {
    message:
      'Phone number must not exceed 16 characters (E.164 format: +[country code][number], max 15 digits + 1 for +)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  token?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUUID()
  activeBadge?: string;
}
