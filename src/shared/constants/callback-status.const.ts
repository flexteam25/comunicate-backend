/**
 * Partner backend callback status constants
 */
export const CALLBACK_STATUS = {
  OK: 'OK',
  REJECT: 'REJECT',
  ALREADY_PROCESSED: 'AlreadyProcessed',
  REFERENCE_NOT_FOUND: 'ReferenceNotFound',
  INSUFFICIENT_PLAYER_BALANCE: 'InsufficientPlayerBalance',
  PLAYER_NOT_FOUND: 'PlayerNotFound',
} as const;

export type CallbackStatus = (typeof CALLBACK_STATUS)[keyof typeof CALLBACK_STATUS];
