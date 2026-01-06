import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { BadgeType } from '../../../../domain/entities/badge.entity';
import { TransformToBoolean } from '../../../../../../shared/utils/transform-boolean.util';

export class CreateBadgeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsEnum(BadgeType)
  @IsNotEmpty()
  badgeType: BadgeType;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  obtain?: string;
}
