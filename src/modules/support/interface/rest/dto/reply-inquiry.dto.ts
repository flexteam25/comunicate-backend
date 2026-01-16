import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';
import { InquiryStatus } from '../../../domain/entities/inquiry.entity';

// Admin can only use PENDING and RESOLVED statuses
const ALLOWED_ADMIN_STATUSES = [InquiryStatus.PENDING, InquiryStatus.RESOLVED];

export class ReplyInquiryDto {
  @IsString({ message: 'REPLY_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'REPLY_REQUIRED' })
  @MaxLength(5000, { message: 'REPLY_MAX_LENGTH' })
  reply: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsIn(ALLOWED_ADMIN_STATUSES, { message: 'INVALID_INQUIRY_STATUS_FOR_ADMIN' })
  status?: InquiryStatus;
}

// Export for use in use case
export { ALLOWED_ADMIN_STATUSES };
