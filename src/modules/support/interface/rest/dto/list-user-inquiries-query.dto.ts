import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { InquiryStatus, InquiryCategory } from '../../../domain/entities/inquiry.entity';

export class ListUserInquiriesQueryDto {
  @IsOptional()
  @IsEnum(InquiryStatus, { message: 'status must be a valid inquiry status' })
  status?: InquiryStatus;

  @IsOptional()
  @IsEnum(InquiryCategory, {
    message: 'category must be one of: inquiry, feedback, bug, advertisement',
  })
  category?: InquiryCategory;

  @IsOptional()
  @IsString({ message: 'cursor must be a string' })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'sortBy must be a string' })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be either ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
