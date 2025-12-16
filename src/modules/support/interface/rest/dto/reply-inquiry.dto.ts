import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { InquiryStatus } from '../../../domain/entities/inquiry.entity';

export class ReplyInquiryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  reply: string;

  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}
