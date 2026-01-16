import { IsOptional, IsBoolean } from 'class-validator';

export class ListUserIpsQueryDto {
  @IsOptional({ message: 'IS_BLOCKED_OPTIONAL' })
  @IsBoolean({ message: 'IS_BLOCKED_MUST_BE_BOOLEAN' })
  isBlocked?: boolean;
}

