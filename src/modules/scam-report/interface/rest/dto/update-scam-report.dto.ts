import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, MaxLength, Min } from 'class-validator';

export class UpdateScamReportDto {
  @IsOptional({ message: 'DESCRIPTION_OPTIONAL' })
  @IsString({ message: 'DESCRIPTION_MUST_BE_STRING' })
  description?: string;

  @IsOptional({ message: 'AMOUNT_OPTIONAL' })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'AMOUNT_MIN_VALUE' })
  amount?: number;
}
