import { IsString, IsUUID, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { IsSlug } from '../../../../../shared/validators/is-slug.validator';

export class ApproveSiteRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Slug must not exceed 50 characters' })
  @IsSlug({ message: 'Slug must contain only lowercase letters, numbers, and hyphens' })
  slug?: string;

  @IsNumber({}, { message: 'Points must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Points must be at least 0' })
  points: number;

  @IsOptional()
  @IsString()
  status?: 'verified' | 'unverified' | 'monitored';

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
