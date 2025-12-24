import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class CreatePostDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId: string;

  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  content: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean({ message: 'Is pinned must be a boolean' })
  isPinned?: boolean;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean({ message: 'Is published must be a boolean' })
  isPublished?: boolean;
}
