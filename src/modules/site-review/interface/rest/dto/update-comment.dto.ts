import { IsString, IsOptional, IsArray, IsUUID, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString({ message: 'Content must be a string' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true, message: 'Each deleteImageId must be a valid UUID' })
  deleteImageIds?: string[];
}
