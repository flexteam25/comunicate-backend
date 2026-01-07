import { IsNotEmpty, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class AssignBadgeDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  badgeId: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  handlePoint?: boolean;
}
