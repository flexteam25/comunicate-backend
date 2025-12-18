import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
