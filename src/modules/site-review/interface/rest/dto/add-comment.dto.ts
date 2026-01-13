import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddCommentDto {
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'CONTENT_REQUIRED' })
  content: string;

  @IsOptional({ message: 'PARENTCOMMENTID_OPTIONAL' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID(undefined, { message: 'PARENTCOMMENTID_MUST_BE_UUID' })
  parentCommentId?: string;
}
