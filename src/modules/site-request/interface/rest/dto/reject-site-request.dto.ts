import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectSiteRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Rejection reason must not exceed 1000 characters' })
  rejectionReason?: string;
}
