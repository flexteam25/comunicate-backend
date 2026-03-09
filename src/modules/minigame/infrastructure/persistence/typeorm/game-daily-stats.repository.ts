import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../../domain/entities/bet-history.entity';
import { GameDailyStats } from '../../../domain/entities/game-daily-stats.entity';
import { LoggerService } from '../../../../../shared/logger/logger.service';

export interface GameDailyStatsRow {
  date: string; // ISO date (YYYY-MM-DD)
  userId: string;
  gameType: string;
  totalBet: number;
  totalWin: number;
  totalDeduct: number;
  netWin: number;
  roundsPlayed: number;
  countWin: number;
  countLose: number;
  countDraw: number;
  totalCancel: number;
  countCancel: number;
  maxSingleWin: number;
}

export interface LeaderboardEntry {
  userId: string;
  totalWin: number;
  totalCancel: number;
  countCancel: number;
  rank: number;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month';

export type AdminLeaderboardSortBy =
  | 'win'
  | 'lose'
  | 'netWin'
  | 'roundsPlayed'
  | 'countWin'
  | 'countLose';

export interface AdminLeaderboardRow {
  userId: string;
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

export interface GameRevenueRow {
  date: string;
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

@Injectable()
export class GameDailyStatsRepository {
  constructor(
    @InjectRepository(BetHistory)
    private readonly betHistoryRepo: Repository<BetHistory>,
    @InjectRepository(GameDailyStats)
    private readonly gameDailyStatsRepo: Repository<GameDailyStats>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Helper: convert a JS Date to KST (Asia/Seoul) calendar date string (YYYY-MM-DD).
   */
  private toKstDateString(date: Date): string {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const y = kst.getUTCFullYear();
    const m = kst.getUTCMonth() + 1;
    const d = kst.getUTCDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  /**
   * Helper: format a Date or string value to YYYY-MM-DD (using local date parts).
   * This is used for response DTOs so that callers always see plain dates.
   */
  private toDateOnlyString(value: string | Date): string {
    if (typeof value === 'string') {
      // Expecting 'YYYY-MM-DD' from DB; trim to be safe.
      return value.slice(0, 10);
    }
    const d = value;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(day)}`;
  }

  /**
   * Aggregate bet_histories into per-user, per-game stats for a given KST (Asia/Seoul) day.
   * Optionally filter by one or more userIds (for CLI backfill / per-user batches).
   */
  async aggregateForDate(date: Date, userIds?: string[]): Promise<GameDailyStatsRow[]> {
    const kstDate = this.toKstDateString(date);

    const qb = this.betHistoryRepo
      .createQueryBuilder('bh')
      .select([
        "date_trunc('day', bh.createdAt AT TIME ZONE 'Asia/Seoul')::date AS date",
        'bh.userId AS "userId"',
        'bh.gameType AS "gameType"',
        'SUM(bh.betAmount) AS "totalBet"',
        "SUM(CASE WHEN bh.roundResult = 'win' or bh.roundResult = 'payout' THEN bh.payoutAmount ELSE 0 END) AS \"totalWin\"",
        'SUM(bh.maxPayoutDeduct) AS "totalDeduct"',
        'COUNT(*) AS "roundsPlayed"',
        "SUM(CASE WHEN bh.roundResult = 'win' or bh.roundResult = 'payout' THEN 1 ELSE 0 END) AS \"countWin\"",
        'SUM(CASE WHEN bh.roundResult = \'lost\' THEN 1 ELSE 0 END) AS "countLose"',
        'SUM(CASE WHEN bh.roundResult = \'draw\' THEN 1 ELSE 0 END) AS "countDraw"',
        'SUM(CASE WHEN bh.roundResult = \'cancelled\' THEN bh.payoutAmount ELSE 0 END) AS "totalCancel"',
        'SUM(CASE WHEN bh.roundResult = \'cancelled\' THEN 1 ELSE 0 END) AS "countCancel"',
        "MAX(CASE WHEN bh.roundResult = 'win' or bh.roundResult = 'payout' THEN bh.payoutAmount ELSE 0 END) AS \"maxSingleWin\"",
      ])
      .where(
        "date_trunc('day', bh.createdAt AT TIME ZONE 'Asia/Seoul')::date = :kstDate",
        { kstDate },
      )
      .andWhere('bh.userId IS NOT NULL')
      .andWhere('bh.gameType IS NOT NULL')
      .groupBy("date_trunc('day', bh.createdAt AT TIME ZONE 'Asia/Seoul')::date")
      .addGroupBy('bh.userId')
      .addGroupBy('bh.gameType');

    if (userIds && userIds.length) {
      qb.andWhere('bh.userId IN (:...userIds)', { userIds });
    }

    const raw = await qb.getRawMany<{
      date: string;
      userId: string;
      gameType: string;
      totalBet: string;
      totalWin: string;
      totalDeduct: string;
      roundsPlayed: string;
      countWin: string;
      countLose: string;
      countDraw: string;
      totalCancel: string;
      countCancel: string;
      maxSingleWin: string;
    }>();

    return raw.map((r) => {
      const totalBet = Number(r.totalBet) || 0;
      const totalWin = Number(r.totalWin) || 0;
      const totalDeduct = Number(r.totalDeduct) || 0;
      const totalCancel = Number(r.totalCancel) || 0;
      const netWin = totalWin - totalBet - totalDeduct;
      return {
        date: r.date,
        userId: r.userId,
        gameType: r.gameType,
        totalBet,
        totalWin,
        totalDeduct,
        netWin,
        roundsPlayed: Number(r.roundsPlayed) || 0,
        countWin: Number(r.countWin) || 0,
        countLose: Number(r.countLose) || 0,
        countDraw: Number(r.countDraw) || 0,
        totalCancel,
        countCancel: Number(r.countCancel) || 0,
        maxSingleWin: Number(r.maxSingleWin) || 0,
      };
    });
  }

  /**
   * Find distinct userIds that have bet_histories in the given KST (Asia/Seoul) day.
   * Used by scheduler to split work into per-user batches.
   */
  async findActiveUserIdsForDate(date: Date): Promise<string[]> {
    const kstDate = this.toKstDateString(date);

    const rows = await this.betHistoryRepo
      .createQueryBuilder('bh')
      .select('DISTINCT bh.userId', 'userId')
      .where(
        "date_trunc('day', bh.createdAt AT TIME ZONE 'Asia/Seoul')::date = :kstDate",
        { kstDate },
      )
      .andWhere('bh.userId IS NOT NULL')
      .andWhere('bh.gameType IS NOT NULL')
      .getRawMany<{ userId: string }>();

    return rows.map((r) => r.userId);
  }

  /**
   * Upsert aggregated rows into game_daily_stats.
   */
  async upsertRows(rows: GameDailyStatsRow[]): Promise<void> {
    if (!rows.length) return;

    const values: Partial<GameDailyStats>[] = rows.map((r) => ({
      date: r.date,
      userId: r.userId,
      gameType: r.gameType,
      totalBet: String(r.totalBet),
      totalWin: String(r.totalWin),
      totalDeduct: String(r.totalDeduct),
      netWin: String(r.netWin),
      roundsPlayed: r.roundsPlayed,
      countWin: r.countWin,
      countLose: r.countLose,
      countDraw: r.countDraw,
      totalCancel: String(r.totalCancel),
      countCancel: r.countCancel,
      maxSingleWin: String(r.maxSingleWin),
    }));

    await this.betHistoryRepo.manager
      .createQueryBuilder()
      .insert()
      .into(GameDailyStats)
      .values(values)
      .orUpdate(
        [
          'total_bet',
          'total_win',
          'total_deduct',
          'net_win',
          'rounds_played',
          'count_win',
          'count_lose',
          'count_draw',
          'total_cancel',
          'count_cancel',
          'max_single_win',
        ],
        ['date', 'user_id', 'game_type'],
      )
      .execute();
  }

  getLeaderboardDateRange(period: LeaderboardPeriod): {
    dateFrom: string;
    dateTo: string;
  } {
    // Use Asia/Seoul (UTC+9) as business timezone for "today"
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = kst.getUTCFullYear();
    const m = kst.getUTCMonth();
    const d = kst.getUTCDate();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (period === 'day') {
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;
      return { dateFrom: dateStr, dateTo: dateStr };
    }

    if (period === 'week') {
      const dayOfWeek = kst.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(Date.UTC(y, m, d + mondayOffset));
      const sunday = new Date(monday);
      sunday.setUTCDate(sunday.getUTCDate() + 6);
      const dateFrom = `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
      const dateTo = `${sunday.getUTCFullYear()}-${pad(sunday.getUTCMonth() + 1)}-${pad(sunday.getUTCDate())}`;
      return { dateFrom, dateTo };
    }

    // month
    const lastDay = new Date(Date.UTC(y, m + 1, 0));
    const dateFrom = `${y}-${pad(m + 1)}-01`;
    const dateTo = `${y}-${pad(m + 1)}-${pad(lastDay.getUTCDate())}`;
    return { dateFrom, dateTo };
  }

  /**
   * Leaderboard: top N winners/losers sorted by total_win.
   * We intentionally avoid net_win for user leaderboard because net_win can be negative.
   */
  async getLeaderboard(
    period: LeaderboardPeriod,
    limit: number = 30,
  ): Promise<{ topWinners: LeaderboardEntry[]; topLosers: LeaderboardEntry[] }> {
    const { dateFrom, dateTo } = this.getLeaderboardDateRange(period);

    const base = () =>
      this.gameDailyStatsRepo
        .createQueryBuilder('g')
        .select('g.user_id', 'userId')
        .addSelect('SUM(g.total_win::numeric)', 'totalWin')
        .addSelect('SUM(g.total_cancel::numeric)', 'totalCancel')
        .addSelect('SUM(g.count_cancel)', 'countCancel')
        .where('g.date >= :dateFrom', { dateFrom })
        .andWhere('g.date <= :dateTo', { dateTo })
        .groupBy('g.user_id');

    const [winnersRaw, losersRaw] = await Promise.all([
      base().orderBy('SUM(g.total_win::numeric)', 'DESC').limit(limit).getRawMany<{
        userId: string;
        totalWin: string;
        totalCancel: string;
        countCancel: string;
      }>(),
      base().orderBy('SUM(g.total_win::numeric)', 'ASC').limit(limit).getRawMany<{
        userId: string;
        totalWin: string;
        totalCancel: string;
        countCancel: string;
      }>(),
    ]);

    const topWinners: LeaderboardEntry[] = winnersRaw.map((r, i) => ({
      userId: r.userId,
      totalWin: Number(r.totalWin) || 0,
      totalCancel: Number(r.totalCancel) || 0,
      countCancel: Number(r.countCancel) || 0,
      rank: i + 1,
    }));

    const topLosers: LeaderboardEntry[] = losersRaw.map((r, i) => ({
      userId: r.userId,
      totalWin: Number(r.totalWin) || 0,
      totalCancel: Number(r.totalCancel) || 0,
      countCancel: Number(r.countCancel) || 0,
      rank: i + 1,
    }));

    return { topWinners, topLosers };
  }

  /**
   * Admin leaderboard: aggregate stats per user in an arbitrary date range
   * with sorting by win/lose/netWin, roundsPlayed, countWin, or countLose.
   */
  async getAdminLeaderboard(params: {
    dateFrom: string;
    dateTo: string;
    sortBy: AdminLeaderboardSortBy;
    orderBy: 'ASC' | 'DESC';
    limit: number;
    gameType?: string;
  }): Promise<AdminLeaderboardRow[]> {
    const { dateFrom, dateTo, sortBy, orderBy, limit, gameType } = params;

    const qb = this.gameDailyStatsRepo
      .createQueryBuilder('g')
      .select('g.user_id', 'userId')
      .addSelect('SUM(g.net_win::numeric)', 'netWin')
      .addSelect('SUM(g.total_bet::numeric)', 'totalBet')
      .addSelect('SUM(g.total_win::numeric)', 'totalWin')
      .addSelect('SUM(g.total_deduct::numeric)', 'totalDeduct')
      .addSelect('SUM(g.rounds_played)', 'roundsPlayed')
      .addSelect('SUM(g.count_win)', 'countWin')
      .addSelect('SUM(g.count_lose)', 'countLose')
      .addSelect('SUM(g.count_draw)', 'countDraw')
      .addSelect('SUM(g.total_cancel::numeric)', 'totalCancel')
      .addSelect('SUM(g.count_cancel)', 'countCancel')
      .where('g.date >= :dateFrom', { dateFrom })
      .andWhere('g.date <= :dateTo', { dateTo })
      .groupBy('g.user_id');

    if (gameType && gameType.trim() !== '') {
      qb.andWhere('g.game_type = :gameType', { gameType: gameType.trim() });
    }

    let orderExpr: string;
    switch (sortBy) {
      case 'win':
        orderExpr = 'SUM(g.total_win::numeric)';
        break;
      case 'lose':
        orderExpr =
          '(SUM(g.total_bet::numeric) + SUM(g.total_deduct::numeric) - SUM(g.total_win::numeric))';
        break;
      case 'netWin':
        orderExpr = 'SUM(g.net_win::numeric)';
        break;
      case 'roundsPlayed':
        orderExpr = 'SUM(g.rounds_played)';
        break;
      case 'countWin':
        orderExpr = 'SUM(g.count_win)';
        break;
      case 'countLose':
        orderExpr = 'SUM(g.count_lose)';
        break;
      default:
        orderExpr = 'SUM(g.total_win::numeric)';
        break;
    }

    const raw = await qb.orderBy(orderExpr, orderBy).limit(limit).getRawMany<{
      userId: string;
      netWin: string;
      totalBet: string;
      totalWin: string;
      totalDeduct: string;
      roundsPlayed: string;
      countWin: string;
      countLose: string;
      countDraw: string;
      totalCancel: string;
      countCancel: string;
    }>();

    return raw.map((r) => ({
      userId: r.userId,
      netWin: Number(r.netWin) || 0,
      totalBet: Number(r.totalBet) || 0,
      totalWin: Number(r.totalWin) || 0,
      totalDeduct: Number(r.totalDeduct) || 0,
      roundsPlayed: Number(r.roundsPlayed) || 0,
      countWin: Number(r.countWin) || 0,
      countLose: Number(r.countLose) || 0,
      countDraw: Number(r.countDraw) || 0,
      totalCancel: Number(r.totalCancel) || 0,
      countCancel: Number(r.countCancel) || 0,
    }));
  }

  /**
   * Game revenue: aggregate stats per game_type and date in a date range.
   */
  async getGameRevenue(params: {
    dateFrom: string;
    dateTo: string;
    gameType?: string;
  }): Promise<GameRevenueRow[]> {
    const { dateFrom, dateTo, gameType } = params;

    const qb = this.gameDailyStatsRepo
      .createQueryBuilder('g')
      .select('g.date', 'date')
      .addSelect('g.game_type', 'gameType')
      .addSelect('SUM(g.total_bet::numeric)', 'totalBet')
      .addSelect('SUM(g.total_win::numeric)', 'totalWin')
      .addSelect('SUM(g.total_deduct::numeric)', 'totalDeduct')
      .addSelect('SUM(g.total_cancel::numeric)', 'totalCancel')
      .addSelect('SUM(g.net_win::numeric)', 'netWin')
      .addSelect('SUM(g.rounds_played)', 'roundsPlayed')
      .addSelect('SUM(g.count_win)', 'countWin')
      .addSelect('SUM(g.count_lose)', 'countLose')
      .addSelect('SUM(g.count_draw)', 'countDraw')
      .addSelect('SUM(g.count_cancel)', 'countCancel')
      .where('g.date >= :dateFrom', { dateFrom })
      .andWhere('g.date <= :dateTo', { dateTo })
      .groupBy('g.date')
      .addGroupBy('g.game_type');

    if (gameType && gameType.trim() !== '') {
      qb.andWhere('g.game_type = :gameType', { gameType: gameType.trim() });
    }

    const raw = await qb
      .orderBy('g.date', 'ASC')
      .addOrderBy('g.game_type', 'ASC')
      .getRawMany<{
        date: string | Date;
        gameType: string;
        totalBet: string;
        totalWin: string;
        totalDeduct: string;
        totalCancel: string;
        netWin: string;
        roundsPlayed: string;
        countWin: string;
        countLose: string;
        countDraw: string;
        countCancel: string;
      }>();

    return raw.map((r) => ({
      date: this.toDateOnlyString(r.date),
      gameType: r.gameType,
      totalBet: Number(r.totalBet) || 0,
      totalWin: Number(r.totalWin) || 0,
      totalDeduct: Number(r.totalDeduct) || 0,
      totalCancel: Number(r.totalCancel) || 0,
      netWin: Number(r.netWin) || 0,
      roundsPlayed: Number(r.roundsPlayed) || 0,
      countWin: Number(r.countWin) || 0,
      countLose: Number(r.countLose) || 0,
      countDraw: Number(r.countDraw) || 0,
      countCancel: Number(r.countCancel) || 0,
    }));
  }
}
