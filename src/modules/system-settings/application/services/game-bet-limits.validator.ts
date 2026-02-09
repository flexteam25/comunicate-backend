import { badRequest, MessageKeys } from '../../../../shared/exceptions/exception-helpers';

export const VALID_GAME_TYPES = [
  'crash',
  'dice',
  'mines',
  'plinko',
  'scissors',
  'slot',
  'turtle',
] as const;

export type GameType = (typeof VALID_GAME_TYPES)[number];

const MIN_BET_MIN = 0.001;
const MIN_BET_MAX = 100_000;
const MAX_BET_MIN = 10;
const MAX_BET_MAX = 10_000_000;
const MAX_PAYOUT_MIN = 0;
const MAX_PAYOUT_MAX = 50_000_000;

export interface GameBetLimitEntry {
  minBet: number;
  maxBet: number;
  maxPayoutAmount: number;
}

export type GameBetLimitsValue = Record<string, GameBetLimitEntry>;

function isGameType(key: string): key is GameType {
  return VALID_GAME_TYPES.includes(key as GameType);
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

/**
 * Validates and merges incoming partial game_bet_limits into current value.
 * Throws badRequest with messageKey and params (e.g. gameType) on first validation error.
 */
export function validateAndMergeGameBetLimits(
  currentValue: GameBetLimitsValue,
  incomingValue: Record<string, unknown>,
): GameBetLimitsValue {
  if (!incomingValue || typeof incomingValue !== 'object' || Array.isArray(incomingValue)) {
    throw badRequest(MessageKeys.VALIDATION_FAILED);
  }

  const merged = JSON.parse(JSON.stringify(currentValue)) as GameBetLimitsValue;

  for (const gameType of Object.keys(incomingValue)) {
    if (!isGameType(gameType)) {
      throw badRequest(MessageKeys.GAME_BET_LIMITS_INVALID_GAME_TYPE, { gameType });
    }

    const raw = incomingValue[gameType];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw badRequest(MessageKeys.VALIDATION_FAILED, { gameType });
    }

    const minBet = (raw as Record<string, unknown>).minBet;
    const maxBet = (raw as Record<string, unknown>).maxBet;
    const maxPayoutAmount = (raw as Record<string, unknown>).maxPayoutAmount;

    if (!isNumber(minBet)) {
      throw badRequest(MessageKeys.VALIDATION_FAILED, { gameType });
    }
    if (!isNumber(maxBet)) {
      throw badRequest(MessageKeys.VALIDATION_FAILED, { gameType });
    }
    if (!isNumber(maxPayoutAmount)) {
      throw badRequest(MessageKeys.VALIDATION_FAILED, { gameType });
    }

    if (minBet < MIN_BET_MIN || minBet > MIN_BET_MAX) {
      throw badRequest(MessageKeys.GAME_BET_LIMITS_MIN_BET_OUT_OF_RANGE, { gameType });
    }
    if (maxBet < MAX_BET_MIN || maxBet > MAX_BET_MAX) {
      throw badRequest(MessageKeys.GAME_BET_LIMITS_MAX_BET_OUT_OF_RANGE, { gameType });
    }
    if (maxPayoutAmount < MAX_PAYOUT_MIN || maxPayoutAmount > MAX_PAYOUT_MAX) {
      throw badRequest(MessageKeys.GAME_BET_LIMITS_MAX_PAYOUT_OUT_OF_RANGE, { gameType });
    }
    if (minBet > maxBet) {
      throw badRequest(MessageKeys.GAME_BET_LIMITS_MIN_BET_MUST_BE_LTE_MAX_BET, { gameType });
    }

    merged[gameType] = { minBet, maxBet, maxPayoutAmount };
  }

  return merged;
}
