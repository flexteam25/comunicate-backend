import { Inject, Injectable } from '@nestjs/common';
import { IAttendanceRepository } from '../../../infrastructure/persistence/repositories/attendance.repository';
import { IAttendanceStatisticRepository } from '../../../infrastructure/persistence/repositories/attendance-statistic.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Attendance } from '../../../domain/entities/attendance.entity';
import { AttendanceStatistic } from '../../../domain/entities/attendance-statistic.entity';
import { getTodayInKST, getDateInKST } from '../../../../../shared/utils/attendance-date.util';

export interface ListAttendancesCommand {
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
  search?: string;
}

@Injectable()
export class AdminListAttendancesUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
    @Inject('IAttendanceStatisticRepository')
    private readonly statisticRepository: IAttendanceStatisticRepository,
  ) {}

  async execute(
    command: ListAttendancesCommand,
  ): Promise<CursorPaginationResult<Attendance>> {
    const realLimit =
      command.limit && command.limit > 0 ? (command.limit > 50 ? 50 : command.limit) : 20;

    // If no date range provided, use today (Korean time)
    let startDate: Date;
    let endDate: Date;

    if (command.startDate && command.endDate) {
      // startDate/endDate đến từ query dạng yyyy-MM-dd → dùng đúng date, convert sang KST date
      startDate = getDateInKST(new Date(command.startDate));
      endDate = getDateInKST(new Date(command.endDate));
    } else {
      // Default to today in KST
      const todayKST = getTodayInKST();
      startDate = todayKST;
      endDate = todayKST;
    }

    // Limit range to maximum 6 months
    const maxEndDate = new Date(startDate);
    maxEndDate.setMonth(maxEndDate.getMonth() + 6);
    if (endDate > maxEndDate) {
      endDate = maxEndDate;
    }

    const result = await this.attendanceRepository.findByDateRange(
      startDate,
      endDate,
      command.cursor,
      realLimit,
      command.search,
    );

    // Load statistics for users by attendance date (similar to /api/attendances)
    const statisticsMap = new Map<string, AttendanceStatistic>();
    if (result.data.length > 0) {
      // Collect unique userIds
      const userIds = Array.from(new Set(result.data.map((a) => a.userId)));

      // Load all statistics for these users in the selected date range in a single query
      const statistics = await this.statisticRepository.findByUserIdsInDateRange(
        userIds,
        startDate,
        endDate,
      );

      // Build map keyed by `${userId}_YYYY-MM-DD`
      statistics.forEach((stat) => {
        const statDate =
          stat.statisticDate instanceof Date
            ? stat.statisticDate
            : new Date(stat.statisticDate);
        const dateKey = statDate.toISOString().split('T')[0];
        const key = `${stat.userId}_${dateKey}`;
        if (!statisticsMap.has(key)) {
          statisticsMap.set(key, stat);
        }
      });
    }

    // Attach statistics to attendances
    result.data.forEach((attendance) => {
      // Ensure attendanceDate is a Date object
      const attendanceDate =
        attendance.attendanceDate instanceof Date
          ? attendance.attendanceDate
          : new Date(attendance.attendanceDate);
      const dateKey = attendanceDate.toISOString().split('T')[0];
      const key = `${attendance.userId}_${dateKey}`;
      const stat = statisticsMap.get(key);
      if (stat) {
        const attendanceWithStats = attendance as Attendance & {
          currentStreak?: number;
          totalAttendanceDays?: number;
        };
        attendanceWithStats.currentStreak = stat.currentStreak;
        attendanceWithStats.totalAttendanceDays = stat.totalAttendanceDays;
      }
    });

    return result;
  }
}
