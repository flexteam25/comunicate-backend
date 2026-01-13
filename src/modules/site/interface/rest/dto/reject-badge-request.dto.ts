import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectBadgeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
