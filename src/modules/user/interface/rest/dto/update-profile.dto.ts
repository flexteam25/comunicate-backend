import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional({ message: 'PHONE_OPTIONAL' })
  @IsString({ message: 'PHONE_MUST_BE_STRING' })
  @MaxLength(16, {
    message: 'Phone number must not exceed 16 characters (E.164 format)',
  })
  phone?: string;

  @IsOptional({ message: 'TOKEN_OPTIONAL' })
  @IsString({ message: 'TOKEN_MUST_BE_STRING' })
  @MaxLength(64, { message: 'TOKEN_MAX_LENGTH' })
  token?: string;

  @IsOptional({ message: 'BIRTHDATE_OPTIONAL' })
  @IsDate({ message: 'BIRTHDATE_MUST_BE_DATE' })
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional({ message: 'GENDER_OPTIONAL' })
  @IsString({ message: 'GENDER_MUST_BE_STRING' })
  @MaxLength(10, { message: 'GENDER_MAX_LENGTH' })
  gender?: string;

  @IsOptional({ message: 'BIO_OPTIONAL' })
  @IsString({ message: 'BIO_MUST_BE_STRING' })
  @MaxLength(500, { message: 'BIO_MAX_LENGTH' })
  bio?: string;

  @IsOptional({ message: 'ACTIVEBADGE_OPTIONAL' })
  @IsString({ message: 'ACTIVEBADGE_MUST_BE_STRING' })
  activeBadge?: string | null;
}
