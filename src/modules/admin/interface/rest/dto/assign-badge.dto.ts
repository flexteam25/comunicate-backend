import { IsNotEmpty, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class AssignBadgeDto {
  @IsUUID(undefined, { message: 'USERID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'USERID_REQUIRED' })
  userId: string;

  @IsUUID(undefined, { message: 'BADGEID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'BADGEID_REQUIRED' })
  badgeId: string;

  @IsOptional({ message: 'HANDLEPOINT_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'HANDLEPOINT_MUST_BE_BOOLEAN' })
  handlePoint?: boolean;
}
