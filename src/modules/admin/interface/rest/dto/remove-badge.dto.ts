import {
  IsNotEmpty,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';

export class RemoveBadgeDto {
  @IsUUID(undefined, { message: 'USERID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'USERID_REQUIRED' })
  userId: string;

  // Backward compatible: allow both string and string[]
  @ValidateIf((o) => typeof o.badgeId === 'string')
  @IsUUID(undefined, { message: 'BADGEID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'BADGEID_REQUIRED' })
  @ValidateIf((o) => Array.isArray(o.badgeId))
  @IsArray({ message: 'BADGEID_MUST_BE_ARRAY' })
  @ArrayNotEmpty({ message: 'BADGEID_REQUIRED' })
  @ArrayMaxSize(20, { message: 'BADGEID_TOO_MANY' })
  @IsUUID(undefined, { each: true, message: 'BADGEID_MUST_BE_UUID' })
  badgeId: string | string[];
}
