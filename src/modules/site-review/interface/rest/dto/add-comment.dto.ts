import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  parentCommentId?: string;
}
