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
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'CATEGORYID_REQUIRED' })
  categoryId: string;

  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TITLE_REQUIRED' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title: string;

  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'CONTENT_REQUIRED' })
  content: string;

  @IsOptional({ message: 'ISPINNED_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISPINNED_MUST_BE_BOOLEAN' })
  isPinned?: boolean;

  @IsOptional({ message: 'ISPUBLISHED_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISPUBLISHED_MUST_BE_BOOLEAN' })
  isPublished?: boolean;
}
