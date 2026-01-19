import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  POINTS = 'points',
  EMAIL = 'email',
  DISPLAY_NAME = 'displayName',
}

export enum SortDir {
  ASC = 'asc',
  DESC = 'desc',
}

export class AdminListUsersQueryDto {
  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;

  @IsOptional({ message: 'EMAIL_OPTIONAL' })
  @IsString({ message: 'EMAIL_MUST_BE_STRING' })
  email?: string;

  @IsOptional({ message: 'DISPLAYNAME_OPTIONAL' })
  @IsString({ message: 'DISPLAYNAME_MUST_BE_STRING' })
  displayName?: string;

  @IsOptional({ message: 'SEARCHIP_OPTIONAL' })
  @IsString({ message: 'SEARCHIP_MUST_BE_STRING' })
  searchIp?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsString({ message: 'STATUS_MUST_BE_STRING' })
  status?: string;

  @IsOptional({ message: 'ISACTIVE_OPTIONAL' })
  @TransformToBoolean
  @IsBoolean({ message: 'ISACTIVE_MUST_BE_BOOLEAN' })
  isActive?: boolean;

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(50, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;

  @IsOptional({ message: 'SORTBY_OPTIONAL' })
  @IsEnum(UserSortBy, {
    message: 'sortBy must be one of: createdAt, points, email, displayName',
  })
  sortBy?: UserSortBy;

  @IsOptional({ message: 'SORTDIR_OPTIONAL' })
  @IsEnum(SortDir, { message: 'SORTDIR_INVALID_ENUM' })
  sortDir?: SortDir;
}
