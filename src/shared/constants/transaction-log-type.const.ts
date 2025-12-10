export const TRANSACTION_LOG_TYPES = {
  BETTING_PLACE: 'betting',
  BETTING_CANCEL: 'betting_cancel',
  BETTING_WIN: 'betting_win',
  BETTING_REFUND: 'betting_refund',
  PARTNER_UPDATE: 'partner_update',
} as const;

export type TransactionLogType =
  (typeof TRANSACTION_LOG_TYPES)[keyof typeof TRANSACTION_LOG_TYPES];

