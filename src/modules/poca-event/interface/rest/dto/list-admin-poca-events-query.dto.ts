import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';

export class ListAdminPocaEventsQueryDto {
  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(PocaEventStatus, {
    message: 'Status must be one of: draft, published, archived',
  })
  status?: PocaEventStatus;

  @IsOptional({ message: 'SEARCH_OPTIONAL' })
  @IsString({ message: 'SEARCH_MUST_BE_STRING' })
  search?: string;

  @IsOptional({ message: 'CURSOR_OPTIONAL' })
  @IsString({ message: 'CURSOR_MUST_BE_STRING' })
  cursor?: string;

  @IsOptional({ message: 'LIMIT_OPTIONAL' })
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN_VALUE' })
  @Max(100, { message: 'LIMIT_MAX_VALUE' })
  limit?: number;
}
