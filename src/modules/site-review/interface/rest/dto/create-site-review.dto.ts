import { IsString, IsNotEmpty, IsNumber, IsUUID, MaxLength, Min, Max } from 'class-validator';

export class CreateSiteReviewDto {
  @IsUUID()
  @IsNotEmpty()
  siteId: string;

  @IsNumber()
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
