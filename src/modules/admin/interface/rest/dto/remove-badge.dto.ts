import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemoveBadgeDto {
  @IsUUID(undefined, { message: 'USERID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'USERID_REQUIRED' })
  userId: string;

  @IsUUID(undefined, { message: 'BADGEID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'BADGEID_REQUIRED' })
  badgeId: string;
}
