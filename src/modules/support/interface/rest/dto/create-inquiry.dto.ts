import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';
import { InquiryCategory } from '../../../domain/entities/inquiry.entity';

export class CreateInquiryDto {
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TITLE_REQUIRED' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title: string;

  @IsEnum(InquiryCategory, {
    message: 'category must be one of: inquiry, feedback, bug, advertisement',
  })
  @IsNotEmpty({ message: 'CATEGORY_REQUIRED' })
  category: InquiryCategory;

  @IsString({ message: 'MESSAGE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'MESSAGE_REQUIRED' })
  @MaxLength(5000, { message: 'MESSAGE_MAX_LENGTH' })
  message: string;
}
