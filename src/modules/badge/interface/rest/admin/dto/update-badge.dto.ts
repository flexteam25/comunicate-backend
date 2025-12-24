import { IsString, IsOptional, IsBoolean } from 'class-validator';
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

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;
}
