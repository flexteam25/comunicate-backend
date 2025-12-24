import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';

export class ListAdminGifticonsQueryDto {
  @IsOptional()
  @IsEnum(GifticonStatus, {
    message: 'Status must be one of: draft, published, archived',
  })
  status?: GifticonStatus;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;
}
