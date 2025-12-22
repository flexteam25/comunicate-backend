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
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Slug must be a string' })
  @MaxLength(255, { message: 'Slug must not exceed 255 characters' })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Summary must be a string' })
  @MaxLength(500, { message: 'Summary must not exceed 500 characters' })
  summary?: string;

  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  content?: string;

  @IsOptional()
  @IsEnum(GifticonStatus, {
    message: 'Status must be one of: draft, published, archived',
  })
  status?: GifticonStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endsAt?: string;

  @IsOptional()
  @IsInt({ message: 'Amount must be an integer' })
  @Min(0, { message: 'Amount must be at least 0' })
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString({ message: 'Delete image must be a string' })
  deleteImage?: string; // "true" to delete image
}
