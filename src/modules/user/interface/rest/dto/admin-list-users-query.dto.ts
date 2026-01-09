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
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsEnum(UserSortBy, {
    message: 'sortBy must be one of: createdAt, points, email, displayName',
  })
  sortBy?: UserSortBy;

  @IsOptional()
  @IsEnum(SortDir, { message: 'sortDir must be asc or desc' })
  sortDir?: SortDir;
}
