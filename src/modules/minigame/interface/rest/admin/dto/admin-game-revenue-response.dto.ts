export interface AdminGameRevenueItemDto {
  date?: string | null;
  gameType: string;
  totalBet: number;
  totalWin: number;
  totalDeduct: number;
  totalCancel: number;
  netWin: number;
  roundsPlayed: number;
  countWin: number;
  countLose: number;
  countDraw: number;
  countCancel: number;
}

export interface AdminGameRevenueResponseDto {
  dateFrom: string;
  dateTo: string;
  items: AdminGameRevenueItemDto[];
}
