import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const CALLBACK_TYPES = ['bet', 'cancel_bet', 'win', 'lose', 'refund'] as const;

export class GameCallbackDto {
  @IsString()
  @IsIn(CALLBACK_TYPES)
  type: (typeof CALLBACK_TYPES)[number];

  @IsNumber()
  @Type(() => Number)
  res: number;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  userUuid: string;

  @IsString()
  txRef: string;

  @IsOptional()
  @IsString()
  roundId?: string;

  @IsOptional()
  @IsString()
  gameType?: string;
}
