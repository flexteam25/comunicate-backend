/**
 * Admin bet history item (includes user).
 */
export interface AdminBetHistoryUserDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
}

export interface AdminBetHistoryItemDto {
  user: AdminBetHistoryUserDto;
  gameType: string;
  roundNumber: string | null;
  betAmount: number;
  payoutAmount: number;
  maxPayoutDeduct: number;
  roundResult: string | null;
  createdAt: string;
}
