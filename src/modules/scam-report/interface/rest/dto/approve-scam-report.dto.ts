import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApproveScamReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
