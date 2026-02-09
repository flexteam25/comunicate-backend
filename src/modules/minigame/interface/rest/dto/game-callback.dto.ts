import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const CALLBACK_TYPES = ['bet', 'cancel_bet', 'win', 'lose', 'draw', 'refund'] as const;

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
  roundNumber?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  betAmount?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  payout?: number;

  @IsOptional()
  @IsString()
  roundResult?: string;

  @IsOptional()
  @IsString()
  coinType?: string;

  @IsOptional()
  @IsString()
  gameType?: string;
}
