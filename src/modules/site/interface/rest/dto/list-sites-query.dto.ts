import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class ListSitesQueryDto {
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID()
  tierId?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  status?: string; // Admin only

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  search?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(['toto', 'casino', 'all'])
  categoryType?: 'toto' | 'casino' | 'all'; // Filter by category type: toto, casino, or all

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(['reviewCount', 'firstCharge', 'recharge', 'experience'], {
    message:
      'filterBy must be one of: reviewCount, firstCharge, recharge, experience (or empty)',
  })
  filterBy?: 'reviewCount' | 'firstCharge' | 'recharge' | 'experience'; // Filter by specific field (highest)

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  cursor?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @Transform(emptyToUndefined)
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
