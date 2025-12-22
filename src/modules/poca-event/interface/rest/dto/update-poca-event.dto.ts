import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';

export class UpdatePocaEventDto {
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
  @IsEnum(PocaEventStatus, {
    message: 'Status must be one of: draft, published, archived',
  })
  status?: PocaEventStatus;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endsAt?: string;

  @IsOptional()
  @IsString({ message: 'Banners order must be a JSON string array' })
  bannersOrder?: string; // JSON string array of numbers: "[0, 1, 2]"

  @IsOptional()
  @IsString({ message: 'Delete primary banner must be a string' })
  deletePrimaryBanner?: string; // "true" to delete primary banner

  @IsOptional()
  @IsString({ message: 'Delete banners must be a string' })
  deleteBanners?: string; // "true" to delete all banners
}

