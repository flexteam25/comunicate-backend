import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateProfileDto {
  @IsOptional({ message: 'DISPLAYNAME_OPTIONAL' })
  @IsString({ message: 'DISPLAYNAME_MUST_BE_STRING' })
  @MaxLength(100, { message: 'DISPLAYNAME_MAX_LENGTH' })
  displayName?: string;
}
