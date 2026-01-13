import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RejectScamReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}
