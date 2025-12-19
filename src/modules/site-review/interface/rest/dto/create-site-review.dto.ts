import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSiteReviewDto {
  @IsUUID()
  @IsNotEmpty()
  siteId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
