import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToBoolean } from '../../../../../../shared/utils/transform-boolean.util';

export class UpdateBadgeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsString()
  @IsOptional()
  iconName?: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  obtain?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50000)
  point?: number;

  @IsString()
  @IsOptional()
  color?: string;
}
