export type LeaderboardPeriodType = 'day' | 'week' | 'month';

export interface LeaderboardUserItemDto {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  userBadge: {
    name: string;
    iconUrl: string | null;
    iconName: string | null;
    color: string | null;
    earnedAt: Date | string;
    description: string | null;
    obtain: string | null;
  } | null;
  totalNetWin: number;
  rank: number;
}

export interface LeaderboardResponseDto {
  period: LeaderboardPeriodType;
  dateFrom: string;
  dateTo: string;
  topWinners: LeaderboardUserItemDto[];
  topLosers: LeaderboardUserItemDto[];
}
