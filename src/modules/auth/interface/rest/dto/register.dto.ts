import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { MaxKoreanChars } from '../../../../../shared/validators/max-korean-chars.validator';

export class RegisterDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  email: string;

  @IsString({ message: 'PASSWORD_MUST_BE_STRING' })
  @MinLength(8, { message: 'PASSWORD_MIN_LENGTH' })
  password: string;

  @IsOptional({ message: 'DISPLAYNAME_OPTIONAL' })
  @IsString({ message: 'DISPLAYNAME_MUST_BE_STRING' })
  @MaxLength(100, { message: 'DISPLAYNAME_MAX_LENGTH' })
  @MaxKoreanChars(6, { message: 'DISPLAYNAME_MAX_KOREAN_CHARS' })
  displayName?: string;

  @IsOptional({ message: 'BIO_OPTIONAL' })
  @IsString({ message: 'BIO_MUST_BE_STRING' })
  @MaxLength(500, { message: 'BIO_MAX_LENGTH' })
  bio?: string;

  @IsString({ message: 'TOKEN_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TOKEN_REQUIRED' })
  @MaxLength(64, { message: 'TOKEN_MAX_LENGTH' })
  token: string;

  @IsOptional({ message: 'BIRTHDATE_OPTIONAL' })
  @IsDate({ message: 'BIRTHDATE_MUST_BE_DATE' })
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional({ message: 'GENDER_OPTIONAL' })
  @IsString({ message: 'GENDER_MUST_BE_STRING' })
  @MaxLength(10, { message: 'GENDER_MAX_LENGTH' })
  gender?: string;

  @IsOptional({ message: 'PARTNER_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'PARTNER_MUST_BE_BOOLEAN' })
  partner?: boolean;
}
