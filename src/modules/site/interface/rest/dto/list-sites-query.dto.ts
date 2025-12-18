import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ListSitesQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsString()
  status?: string; // Admin only

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['toto', 'casino', 'all'])
  categoryType?: 'toto' | 'casino' | 'all'; // Filter by category type: toto, casino, or all

  @IsOptional()
  @IsEnum(['reviewCount', 'firstCharge', 'recharge', 'experience'])
  filterBy?: 'reviewCount' | 'firstCharge' | 'recharge' | 'experience'; // Filter by specific field (highest)

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(['tier', 'createdAt', 'reviewCount', 'firstCharge', 'recharge', 'experience'])
  sortBy?:
    | 'tier'
    | 'createdAt'
    | 'reviewCount'
    | 'firstCharge'
    | 'recharge'
    | 'experience'; // Sort by tier or newest

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
