import { IsUUID } from 'class-validator';

export class AssignBadgeDto {
  @IsUUID(undefined, { message: 'BADGEID_MUST_BE_UUID' })
  badgeId: string;
}
