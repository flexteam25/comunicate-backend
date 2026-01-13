import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddCommentDto {
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'CONTENT_REQUIRED' })
  content: string;

  @IsOptional({ message: 'PARENTCOMMENTID_OPTIONAL' })
  @IsUUID(undefined, { message: 'PARENTCOMMENTID_MUST_BE_UUID' })
  parentCommentId?: string;
}
