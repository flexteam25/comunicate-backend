import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class UpdateSiteEventDto {
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
  @TransformToBoolean
  @IsBoolean({ message: 'Is active must be a boolean' })
  isActive?: boolean;
}

