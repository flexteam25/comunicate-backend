import { IsOptional, IsString } from 'class-validator';

export class RejectExchangeDto {
  @IsOptional({ message: 'REASON_OPTIONAL' })
  @IsString({ message: 'REASON_MUST_BE_STRING' })
  reason?: string;
}
