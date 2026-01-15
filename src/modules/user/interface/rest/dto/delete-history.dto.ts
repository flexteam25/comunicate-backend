import { IsOptional, IsArray, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteHistoryDto {
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true, message: 'DELETE_MUST_BE_ARRAY_OF_UUID' })
  delete?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  deleteAll?: boolean;
}
