import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { InquiryStatus } from '../../../domain/entities/inquiry.entity';

export class ReplyInquiryDto {
  @IsString({ message: 'reply must be a string' })
  @IsNotEmpty({ message: 'reply is required' })
  @MaxLength(5000, { message: 'reply must not exceed 5000 characters' })
  reply: string;

  @IsOptional()
  @IsEnum(InquiryStatus, { message: 'status must be a valid inquiry status' })
  status?: InquiryStatus;
}
