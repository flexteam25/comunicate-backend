import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAttendanceDto {
  @IsOptional({ message: 'MESSAGE_OPTIONAL' })
  @IsString({ message: 'MESSAGE_MUST_BE_STRING' })
  @MaxLength(20, { message: 'MESSAGE_MAX_LENGTH' })
  message?: string;
}
