import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AddCommentDto {
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'CONTENT_REQUIRED' })
  @MaxLength(5000, { message: 'CONTENT_MAX_LENGTH' })
  content: string;

  @IsOptional({ message: 'PARENTCOMMENTID_OPTIONAL' })
  @IsUUID(undefined, { message: 'PARENTCOMMENTID_MUST_BE_UUID' })
  parentCommentId?: string;
}
