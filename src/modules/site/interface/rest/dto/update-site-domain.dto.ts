import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSiteDomainDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
