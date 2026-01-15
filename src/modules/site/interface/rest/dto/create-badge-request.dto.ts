import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateBadgeRequestDto {
  @IsUUID(undefined, { message: 'BADGEID_MUST_BE_UUID' })
  badgeId: string;

  @IsOptional({ message: 'CONTENT_OPTIONAL' })
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  content?: string | null; // Allow empty string or null
}
