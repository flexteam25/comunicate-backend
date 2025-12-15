import { IsString, IsUUID, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { SiteStatus } from '../../../domain/entities/site.entity';

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;


  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  permanentUrl?: string;

  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @IsOptional()
  @IsString()
  description?: string;
}

