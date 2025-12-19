import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { InquiryCategory } from '../../../domain/entities/inquiry.entity';

export class UpdateInquiryDto {
  @IsOptional()
  @IsString({ message: 'title must be a string' })
  @MaxLength(255, { message: 'title must not exceed 255 characters' })
  title?: string;

  @IsOptional()
  @IsEnum(InquiryCategory, {
    message: 'category must be one of: inquiry, feedback, bug, advertisement',
  })
  category?: InquiryCategory;

  @IsOptional()
  @IsString({ message: 'message must be a string' })
  @MaxLength(5000, { message: 'message must not exceed 5000 characters' })
  message?: string;
}
