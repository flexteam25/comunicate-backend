import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';

export class UpdateGifticonDto {
  @IsOptional({ message: 'TITLE_OPTIONAL' })
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title?: string;

  @IsOptional({ message: 'SLUG_OPTIONAL' })
  @IsString({ message: 'SLUG_MUST_BE_STRING' })
  @MaxLength(255, { message: 'SLUG_MAX_LENGTH' })
  slug?: string;

  @IsOptional({ message: 'SUMMARY_OPTIONAL' })
  @IsString({ message: 'SUMMARY_MUST_BE_STRING' })
  @MaxLength(500, { message: 'SUMMARY_MAX_LENGTH' })
  summary?: string;

  @IsOptional({ message: 'CONTENT_OPTIONAL' })
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  content?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(GifticonStatus, {
    message: 'Status must be one of: draft, published, archived',
  })
  status?: GifticonStatus;

  @IsOptional({ message: 'STARTSAT_OPTIONAL' })
  @IsDateString({}, { message: 'STARTSAT_MUST_BE_DATE_STRING' })
  startsAt?: string;

  @IsOptional({ message: 'ENDSAT_OPTIONAL' })
  @IsDateString({}, { message: 'ENDSAT_MUST_BE_DATE_STRING' })
  endsAt?: string;

  @IsOptional({ message: 'AMOUNT_OPTIONAL' })
  @IsInt({ message: 'AMOUNT_MUST_BE_INTEGER' })
  @Min(0, { message: 'AMOUNT_MIN_VALUE' })
  @Type(() => Number)
  amount?: number;

  @IsOptional({ message: 'DELETEIMAGE_OPTIONAL' })
  @IsString({ message: 'DELETEIMAGE_MUST_BE_STRING' })
  deleteImage?: string; // "true" to delete image

  @IsOptional({ message: 'TYPECOLOR_OPTIONAL' })
  @IsString({ message: 'TYPECOLOR_MUST_BE_STRING' })
  @MaxLength(50, { message: 'TYPECOLOR_MAX_LENGTH' })
  typeColor?: string;
}
