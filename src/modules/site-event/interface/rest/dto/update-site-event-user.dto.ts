import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsArray,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class UpdateSiteEventUserDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO 8601 date string' })
  endDate?: string;

  @IsOptional()
  @IsArray({ message: 'Link URLs must be an array' })
  @IsUrl({}, { each: true, message: 'Each link URL must be a valid URL' })
  linkUrls?: string[];

  @IsOptional()
  @IsArray({ message: 'Delete banners must be an array' })
  @IsUUID('4', { each: true, message: 'Each delete banner ID must be a valid UUID' })
  deleteBanners?: string[];
}
