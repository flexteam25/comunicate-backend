import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectPartnerRequestDto {
  @IsOptional()
  @IsString({ message: 'Rejection reason must be a string' })
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  rejectionReason?: string;
}
