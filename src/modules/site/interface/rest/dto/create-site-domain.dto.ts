import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSiteDomainDto {
  @IsString()
  domain: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
