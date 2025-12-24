import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';

export class CreatePocaEventDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Slug must be a string' })
  @MaxLength(255, { message: 'Slug must not exceed 255 characters' })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'Summary must be a string' })
  @MaxLength(500, { message: 'Summary must not exceed 500 characters' })
  summary?: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  content: string;

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
}
