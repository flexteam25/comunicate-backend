import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { MaxKoreanChars } from '../../../../../shared/validators/max-korean-chars.validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @MaxKoreanChars(6)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16, {
    message: 'Phone number must not exceed 16 characters (E.164 format)',
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
  @IsString()
  activeBadge?: string | null;
}
