import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminUpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}

