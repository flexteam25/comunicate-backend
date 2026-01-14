import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveBadgeRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
