import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AddCommentDto {
  @IsString({ message: 'Content must be a string' })
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content: string;

  @IsOptional()
  @IsUUID()
  parentCommentId?: string;
}
