export type AdminLeaderboardSortBy =
  | 'win'
  | 'lose'
  | 'netWin'
  | 'roundsPlayed'
  | 'countWin'
  | 'countLose';

export type AdminLeaderboardOrderBy = 'asc' | 'desc';

export interface AdminLeaderboardUserDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl?: string | null;
}

export interface AdminLeaderboardItemDto {
  user: AdminLeaderboardUserDto;
  netWin: number;
  totalBet: number;
  totalWin: number;
  totalDeduct: number;
  roundsPlayed: number;
  countWin: number;
  countLose: number;
  countDraw: number;
  totalCancel: number;
  countCancel: number;
}

export interface AdminLeaderboardResponseDto {
  dateFrom: string;
  dateTo: string;
  sortBy: AdminLeaderboardSortBy;
  orderBy: AdminLeaderboardOrderBy;
  items: AdminLeaderboardItemDto[];
}
