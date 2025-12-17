import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAttendanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Message cannot exceed 20 characters' })
  message?: string;
}
