import { IsUUID } from 'class-validator';

export class AssignBadgeDto {
  @IsUUID()
  badgeId: string;
}
