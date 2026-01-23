import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';
import { IsSlug } from '../../../../../shared/validators/is-slug.validator';

export class ApproveSiteRequestDto {
  @IsOptional({ message: 'SLUG_OPTIONAL' })
  @IsString({ message: 'SLUG_MUST_BE_STRING' })
  @MaxLength(50, { message: 'SLUG_MAX_LENGTH' })
  @IsSlug({ message: 'SLUG_INVALID_FORMAT' })
  slug?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsString({ message: 'STATUS_MUST_BE_STRING' })
  status?: 'verified' | 'unverified' | 'monitored';

  @IsOptional({ message: 'TIERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'TIERID_MUST_BE_UUID' })
  tierId?: string;

  @IsOptional({ message: 'CATEGORYID_OPTIONAL' })
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId?: string;
}
