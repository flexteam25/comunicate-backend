import { IsString, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator';

export class UpdateSiteReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
