import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePostDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  content?: string;

  @IsOptional()
  @IsBoolean({ message: 'Is published must be a boolean' })
  @Type(() => Boolean)
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Is pinned must be a boolean' })
  @Type(() => Boolean)
  isPinned?: boolean;

  @IsOptional()
  @IsString({ message: 'Delete thumbnail flag must be a string' })
  @IsIn(['true', 'false'], {
    message: 'Delete thumbnail flag must be "true" or "false"',
  })
  deleteThumbnail?: 'true' | 'false';
}
