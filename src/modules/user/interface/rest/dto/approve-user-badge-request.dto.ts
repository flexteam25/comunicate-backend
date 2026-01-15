import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveUserBadgeRequestDto {
  @IsOptional({ message: 'NOTE_OPTIONAL' })
  @IsString({ message: 'NOTE_MUST_BE_STRING' })
  note?: string;

  @IsOptional({ message: 'HANDLEPOINT_OPTIONAL' })
  @Type(() => Boolean)
  @IsBoolean({ message: 'HANDLEPOINT_MUST_BE_BOOLEAN' })
  handlePoint?: boolean;
}
