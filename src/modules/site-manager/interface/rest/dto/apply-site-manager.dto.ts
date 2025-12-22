import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApplySiteManagerDto {
  @IsNotEmpty({ message: 'Message is required' })
  @IsString({ message: 'Message must be a string' })
  @MaxLength(5000, { message: 'Message must not exceed 5000 characters' })
  message: string;
}
