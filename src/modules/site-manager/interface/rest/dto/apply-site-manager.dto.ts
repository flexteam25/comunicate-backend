import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApplySiteManagerDto {
  @IsNotEmpty({ message: 'MESSAGE_REQUIRED' })
  @IsString({ message: 'MESSAGE_MUST_BE_STRING' })
  @MaxLength(5000, { message: 'MESSAGE_MAX_LENGTH' })
  message: string;
}
