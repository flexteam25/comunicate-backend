import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateBugReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
