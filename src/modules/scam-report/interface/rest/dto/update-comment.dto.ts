import { IsString, IsOptional, IsArray, IsUUID, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional({ message: 'CONTENT_OPTIONAL' })
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  @MaxLength(5000, { message: 'CONTENT_MAX_LENGTH' })
  content?: string;

  @IsOptional({ message: 'DELETEIMAGEIDS_OPTIONAL' })
  @IsArray()
  @IsUUID(undefined, { each: true, message: 'DELETEIMAGEIDS_MUST_BE_UUID' })
  deleteImageIds?: string[];
}
