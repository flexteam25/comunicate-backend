import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { InquiryStatus, InquiryCategory } from '../../../domain/entities/inquiry.entity';

export class ListInquiriesQueryDto {
  @IsOptional({ message: 'USERNAME_OPTIONAL' })
  @IsString({ message: 'USERNAME_MUST_BE_STRING' })
  userName?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(InquiryStatus, { message: 'STATUS_INVALID_ENUM' })
  status?: InquiryStatus;

  @IsOptional({ message: 'CATEGORY_OPTIONAL' })
  @IsEnum(InquiryCategory, {
    message: 'category must be one of: inquiry, feedback, bug, advertisement',
  })
  category?: InquiryCategory;

  @IsOptional({ message: 'ADMINNAME_OPTIONAL' })
  @IsString({ message: 'ADMINNAME_MUST_BE_STRING' })
  adminName?: string;

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(100, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;

  @IsOptional({ message: 'SORTBY_OPTIONAL' })
  @IsString({ message: 'SORTBY_MUST_BE_STRING' })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'sortOrder must be either ASC or DESC' })
  sortOrder?: 'ASC' | 'DESC';
}
