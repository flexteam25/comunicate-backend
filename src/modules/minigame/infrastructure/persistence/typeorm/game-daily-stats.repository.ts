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
  maxSingleWin: number;
}

export interface LeaderboardEntry {
  userId: string;
  totalNetWin: number;
  rank: number;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month';

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
   * Aggregate bet_histories into per-user, per-game stats for a given UTC day.
   * Optionally filter by one or more userIds (for CLI backfill / per-user batches).
   */
  async aggregateForDate(date: Date, userIds?: string[]): Promise<GameDailyStatsRow[]> {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );

    const qb = this.betHistoryRepo
      .createQueryBuilder('bh')
      .select([
        "date_trunc('day', bh.createdAt AT TIME ZONE 'UTC')::date AS date",
        'bh.userId AS "userId"',
        'bh.gameType AS "gameType"',
        'SUM(bh.betAmount) AS "totalBet"',
        "SUM(CASE WHEN bh.roundResult = 'win' or bh.roundResult = 'payout' THEN bh.payoutAmount ELSE 0 END) AS \"totalWin\"",
        'SUM(bh.maxPayoutDeduct) AS "totalDeduct"',
        'COUNT(*) AS "roundsPlayed"',
        "SUM(CASE WHEN bh.roundResult = 'win' or bh.roundResult = 'payout' THEN 1 ELSE 0 END) AS \"countWin\"",
        'SUM(CASE WHEN bh.roundResult = \'lost\' THEN 1 ELSE 0 END) AS "countLose"',
        'SUM(CASE WHEN bh.roundResult = \'draw\' THEN 1 ELSE 0 END) AS "countDraw"',
        "MAX(CASE WHEN bh.roundResult = 'win' or bh.roundResult = 'payout' THEN bh.payoutAmount ELSE 0 END) AS \"maxSingleWin\"",
      ])
      .where('bh.createdAt >= :start', { start })
      .andWhere('bh.createdAt < :end', { end })
      .andWhere('bh.userId IS NOT NULL')
      .andWhere('bh.gameType IS NOT NULL')
      .groupBy("date_trunc('day', bh.createdAt AT TIME ZONE 'UTC')::date")
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
      maxSingleWin: string;
    }>();

    return raw.map((r) => {
      const totalBet = Number(r.totalBet) || 0;
      const totalWin = Number(r.totalWin) || 0;
      const totalDeduct = Number(r.totalDeduct) || 0;
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
        maxSingleWin: Number(r.maxSingleWin) || 0,
      };
    });
  }

  /**
   * Find distinct userIds that have bet_histories in the given UTC day.
   * Used by scheduler to split work into per-user batches.
   */
  async findActiveUserIdsForDate(date: Date): Promise<string[]> {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
    );
    const end = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    );

    const rows = await this.betHistoryRepo
      .createQueryBuilder('bh')
      .select('DISTINCT bh.userId', 'userId')
      .where('bh.createdAt >= :start', { start })
      .andWhere('bh.createdAt < :end', { end })
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
          'max_single_win',
        ],
        ['date', 'user_id', 'game_type'],
      )
      .execute();
  }

  getLeaderboardDateRange(period: LeaderboardPeriod): { dateFrom: string; dateTo: string } {
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
   * Leaderboard: top N winners (net_win DESC) and top N losers (net_win ASC)
   * aggregated from game_daily_stats in the given date range.
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
        .addSelect('SUM(g.net_win::numeric)', 'totalNetWin')
        .where('g.date >= :dateFrom', { dateFrom })
        .andWhere('g.date <= :dateTo', { dateTo })
        .groupBy('g.user_id');

    const [winnersRaw, losersRaw] = await Promise.all([
      base().orderBy('SUM(g.net_win::numeric)', 'DESC').limit(limit).getRawMany<{ userId: string; totalNetWin: string }>(),
      base().orderBy('SUM(g.net_win::numeric)', 'ASC').limit(limit).getRawMany<{ userId: string; totalNetWin: string }>(),
    ]);

    const topWinners: LeaderboardEntry[] = winnersRaw.map((r, i) => ({
      userId: r.userId,
      totalNetWin: Number(r.totalNetWin) || 0,
      rank: i + 1,
    }));

    const topLosers: LeaderboardEntry[] = losersRaw.map((r, i) => ({
      userId: r.userId,
      totalNetWin: Number(r.totalNetWin) || 0,
      rank: i + 1,
    }));

    return { topWinners, topLosers };
  }
}
