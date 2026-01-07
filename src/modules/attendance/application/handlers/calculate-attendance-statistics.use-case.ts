import { Inject, Injectable } from '@nestjs/common';
import { IAttendanceRepository } from '../../infrastructure/persistence/repositories/attendance.repository';
import { IAttendanceStatisticRepository } from '../../infrastructure/persistence/repositories/attendance-statistic.repository';
import { AttendanceStatistic } from '../../domain/entities/attendance-statistic.entity';
import {
  getTodayInKST,
  getYesterdayInKST,
} from '../../../../shared/utils/attendance-date.util';

@Injectable()
export class CalculateAttendanceStatisticsUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
    @Inject('IAttendanceStatisticRepository')
    private readonly statisticRepository: IAttendanceStatisticRepository,
  ) {}

  async execute(): Promise<void> {
    // Get today's and yesterday's dates in KST (+9 timezone)
    const today = getTodayInKST();
    const yesterday = getYesterdayInKST();

    // Get all attendances for today
    const attendances = await this.attendanceRepository.findAllByDate(today);

    if (attendances.length === 0) {
      return;
    }

    // Batch load yesterday's statistics for all users (avoid N+1 queries)
    const userIds = attendances.map((a) => a.userId);
    const yesterdayStats = await this.statisticRepository.findByUserIdsAndDate(
      userIds,
      yesterday,
    );
    const yesterdayStatsMap = new Map<string, AttendanceStatistic>();
    yesterdayStats.forEach((stat) => {
      yesterdayStatsMap.set(stat.userId, stat);
    });

    // Batch process all statistics
    const statisticsToSave = attendances.map((attendance, index) => {
      const yesterdayStat = yesterdayStatsMap.get(attendance.userId);

      // Calculate total attendance days
      const totalAttendanceDays = (yesterdayStat?.totalAttendanceDays || 0) + 1;

      // Calculate current streak
      let currentStreak: number;
      if (yesterdayStat && yesterdayStat.currentStreak > 0) {
        currentStreak = yesterdayStat.currentStreak + 1;
      } else {
        currentStreak = 1;
      }

      // Calculate rank: Since attendances are already sorted by createdAt ASC, rank = index + 1
      const rank = index + 1;

      return {
        userId: attendance.userId,
        statisticDate: today,
        totalAttendanceDays,
        currentStreak,
        attendanceTime: attendance.createdAt,
        attendanceRank: rank,
        dailyMessage: attendance.message,
      };
    });

    // Batch save all statistics (avoid multiple individual updates)
    for (const statistic of statisticsToSave) {
      await this.statisticRepository.createOrUpdate(statistic);
    }
  }
}
