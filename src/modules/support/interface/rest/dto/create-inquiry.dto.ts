import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { InquiryCategory } from '../../../domain/entities/inquiry.entity';

export class CreateInquiryDto {
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(255, { message: 'title must not exceed 255 characters' })
  title: string;

  @IsEnum(InquiryCategory, {
    message: 'category must be one of: inquiry, feedback, bug, advertisement',
  })
  @IsNotEmpty({ message: 'category is required' })
  category: InquiryCategory;

  @IsString({ message: 'message must be a string' })
  @IsNotEmpty({ message: 'message is required' })
  @MaxLength(5000, { message: 'message must not exceed 5000 characters' })
  message: string;
}
