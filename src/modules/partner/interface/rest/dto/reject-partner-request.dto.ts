import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPartnerRequestDto {
  @IsOptional({ message: 'REJECTIONREASON_OPTIONAL' })
  @IsString({ message: 'REJECTIONREASON_MUST_BE_STRING' })
  @MaxLength(1000, { message: 'REJECTIONREASON_MAX_LENGTH' })
  rejectionReason?: string;
}
