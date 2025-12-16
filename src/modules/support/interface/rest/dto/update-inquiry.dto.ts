import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateInquiryDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}
