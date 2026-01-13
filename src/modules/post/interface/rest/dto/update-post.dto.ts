import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  MaxLength,
  IsIn,
} from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class UpdatePostDto {
  @IsOptional({ message: 'CATEGORYID_OPTIONAL' })
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId?: string;

  @IsOptional({ message: 'TITLE_OPTIONAL' })
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title?: string;

  @IsOptional({ message: 'CONTENT_OPTIONAL' })
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  content?: string;

  @IsOptional({ message: 'ISPUBLISHED_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISPUBLISHED_MUST_BE_BOOLEAN' })
  isPublished?: boolean;

  @IsOptional({ message: 'ISPINNED_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISPINNED_MUST_BE_BOOLEAN' })
  isPinned?: boolean;

  @IsOptional()
  @IsString({ message: 'Delete thumbnail flag must be a string' })
  @IsIn(['true', 'false'], {
    message: 'Delete thumbnail flag must be "true" or "false"',
  })
  deleteThumbnail?: 'true' | 'false';
}
