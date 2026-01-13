import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { InquiryCategory } from '../../../domain/entities/inquiry.entity';

export class UpdateInquiryDto {
  @IsOptional({ message: 'TITLE_OPTIONAL' })
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title?: string;

  @IsOptional({ message: 'CATEGORY_OPTIONAL' })
  @IsEnum(InquiryCategory, {
    message: 'category must be one of: inquiry, feedback, bug, advertisement',
  })
  category?: InquiryCategory;

  @IsOptional({ message: 'MESSAGE_OPTIONAL' })
  @IsString({ message: 'MESSAGE_MUST_BE_STRING' })
  @MaxLength(5000, { message: 'MESSAGE_MAX_LENGTH' })
  message?: string;
}
