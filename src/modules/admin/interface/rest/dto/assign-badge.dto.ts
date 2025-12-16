import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignBadgeDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  badgeId: string;
}
