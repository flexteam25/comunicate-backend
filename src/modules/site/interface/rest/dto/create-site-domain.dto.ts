import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class CreateSiteDomainDto {
  @IsString({ message: 'DOMAIN_MUST_BE_STRING' })
  domain: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsOptional({ message: 'ISCURRENT_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISCURRENT_MUST_BE_BOOLEAN' })
  isCurrent?: boolean;
}
