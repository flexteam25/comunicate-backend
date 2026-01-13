import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { InquiryStatus } from '../../../domain/entities/inquiry.entity';

export class ReplyInquiryDto {
  @IsString({ message: 'REPLY_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'REPLY_REQUIRED' })
  @MaxLength(5000, { message: 'REPLY_MAX_LENGTH' })
  reply: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(InquiryStatus, { message: 'STATUS_INVALID_ENUM' })
  status?: InquiryStatus;
}
