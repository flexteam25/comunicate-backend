import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
