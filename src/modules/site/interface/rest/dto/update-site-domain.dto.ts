import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class UpdateSiteDomainDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isCurrent?: boolean;
}
