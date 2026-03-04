/**
 * User's own bet history item (from bet_histories).
 */
export interface BetHistoryItemDto {
  id: string;
  gameType: string;
  roundNumber: string | null;
  betAmount: number;
  payoutAmount: number;
  maxPayoutDeduct: number;
  roundResult: string | null;
  createdAt: string;
}
