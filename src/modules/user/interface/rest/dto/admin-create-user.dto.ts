import { IsEmail, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';
import { MaxKoreanChars } from '../../../../../shared/validators/max-korean-chars.validator';

export class AdminCreateUserDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  email: string;

  @IsString({ message: 'PASSWORD_MUST_BE_STRING' })
  @MinLength(8, { message: 'PASSWORD_MIN_LENGTH' })
  password: string;

  @IsOptional({ message: 'DISPLAYNAME_OPTIONAL' })
  @IsString({ message: 'DISPLAYNAME_MUST_BE_STRING' })
  @MaxKoreanChars(6, { message: 'DISPLAYNAME_MAX_KOREAN_CHARS' })
  displayName?: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsOptional({ message: 'PARTNER_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'PARTNER_MUST_BE_BOOLEAN' })
  partner?: boolean;
}
