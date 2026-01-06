import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, MaxLength, Min } from 'class-validator';

export class UpdateScamReportDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;
}
