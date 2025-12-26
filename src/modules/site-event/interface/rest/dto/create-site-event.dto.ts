import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateSiteEventDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Site ID is required' })
  siteId: string;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Start date is required' })
  startDate: string;

  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'End date is required' })
  endDate: string;
}

