import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRedemptionDto {
  @IsOptional({ message: 'REASON_OPTIONAL' })
  @IsString({ message: 'REASON_MUST_BE_STRING' })
  @MaxLength(1000, { message: 'REASON_MAX_LENGTH' })
  reason?: string;
}
