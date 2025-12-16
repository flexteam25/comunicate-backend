import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  permanentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mainImageUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
