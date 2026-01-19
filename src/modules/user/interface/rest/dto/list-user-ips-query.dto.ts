import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class ListUserIpsQueryDto {
  @IsOptional({ message: 'IS_BLOCKED_OPTIONAL' })
  @IsBoolean({ message: 'IS_BLOCKED_MUST_BE_BOOLEAN' })
  isBlocked?: boolean;

  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;
}
