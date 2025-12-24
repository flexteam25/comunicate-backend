import { IsOptional, IsString } from 'class-validator';

export class RejectExchangeDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
