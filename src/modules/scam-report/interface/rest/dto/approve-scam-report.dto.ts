import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ApproveScamReportDto {
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TITLE_REQUIRED' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title: string;
}
