import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateAdminDto {
  @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
  email: string;

  @IsString({ message: 'PASSWORD_MUST_BE_STRING' })
  @MinLength(8, { message: 'PASSWORD_MIN_LENGTH' })
  password: string;

  @IsOptional({ message: 'DISPLAYNAME_OPTIONAL' })
  @IsString({ message: 'DISPLAYNAME_MUST_BE_STRING' })
  displayName?: string;

  @IsOptional({ message: 'PERMISSIONIDS_OPTIONAL' })
  @IsArray()
  @IsUUID(4, { each: true, message: 'PERMISSIONIDS_MUST_BE_UUID' })
  permissionIds?: string[];
}
