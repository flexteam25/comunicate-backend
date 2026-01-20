import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TetherDepositWithdrawalStatus } from '../../../domain/entities/site.entity';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

export class ListSitesQueryDto {
  @Transform(emptyToUndefined)
  @IsOptional({ message: 'CATEGORYID_OPTIONAL' })
  @IsUUID(undefined, { message: 'CATEGORYID_MUST_BE_UUID' })
  categoryId?: string;

  @Transform(emptyToUndefined)
  @IsOptional({ message: 'TIERID_OPTIONAL' })
  @IsUUID(undefined, { message: 'TIERID_MUST_BE_UUID' })
  tierId?: string;

  @Transform(emptyToUndefined)
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsString({ message: 'STATUS_MUST_BE_STRING' })
  status?: string; // Admin only

  @Transform(emptyToUndefined)
  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(['toto', 'casino', 'all'], { message: 'CATEGORYTYPE_INVALID_ENUM' })
  categoryType?: 'toto' | 'casino' | 'all'; // Filter by category type: toto, casino, or all

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(TetherDepositWithdrawalStatus, {
    message: 'TETHERDEPOSITWITHDRAWALSTATUS_INVALID_ENUM',
  })
  tether?: TetherDepositWithdrawalStatus; // Filter by tether deposit/withdrawal status

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(['reviewCount', 'firstCharge', 'recharge', 'experience', 'tether'], {
    message: 'FILTERBY_INVALID_ENUM',
  })
  filterBy?: 'reviewCount' | 'firstCharge' | 'recharge' | 'experience' | 'tether'; // Filter by specific field (highest)

  @Transform(emptyToUndefined)
  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @Transform(emptyToUndefined)
  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(100, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(
    ['tier', 'createdAt', 'reviewCount', 'firstCharge', 'recharge', 'experience'],
    { message: 'SORTBY_INVALID_ENUM' },
  )
  sortBy?:
    | 'tier'
    | 'createdAt'
    | 'reviewCount'
    | 'firstCharge'
    | 'recharge'
    | 'experience'; // Sort by tier or newest

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'SORTORDER_INVALID_ENUM' })
  sortOrder?: 'ASC' | 'DESC';
}
