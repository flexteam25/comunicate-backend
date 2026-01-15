import { IsOptional, IsString } from 'class-validator';

export class RejectUserBadgeRequestDto {
  @IsOptional({ message: 'NOTE_OPTIONAL' })
  @IsString({ message: 'NOTE_MUST_BE_STRING' })
  note?: string;
}
