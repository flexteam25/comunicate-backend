import { Inject, Injectable } from '@nestjs/common';
import { IAttendanceRepository } from '../../../infrastructure/persistence/repositories/attendance.repository';
import { IAttendanceStatisticRepository } from '../../../infrastructure/persistence/repositories/attendance-statistic.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Attendance } from '../../../domain/entities/attendance.entity';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { getTodayInKST, getDateInKST } from '../../../../../shared/utils/attendance-date.util';

export interface GetUserAttendanceCommand {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AdminGetUserAttendanceUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
    @Inject('IAttendanceStatisticRepository')
    private readonly statisticRepository: IAttendanceStatisticRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    command: GetUserAttendanceCommand,
  ): Promise<CursorPaginationResult<Attendance>> {
    // Verify user exists
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw notFound(MessageKeys.USER_NOT_FOUND);
    }

    const realLimit =
      command.limit && command.limit > 0 ? (command.limit > 50 ? 50 : command.limit) : 20;

    // If no date range provided, use today (Korean time)
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (command.startDate && command.endDate) {
      // startDate/endDate đến từ query dạng yyyy-MM-dd → dùng đúng date, convert sang KST date
      startDate = getDateInKST(new Date(command.startDate));
      endDate = getDateInKST(new Date(command.endDate));
    } else {
      const todayKST = getTodayInKST();
      startDate = todayKST;
      endDate = todayKST;
    }

    // Limit range to maximum 6 months
    if (startDate && endDate) {
      const maxEndDate = new Date(startDate);
      maxEndDate.setMonth(maxEndDate.getMonth() + 6);
      if (endDate > maxEndDate) {
        endDate = maxEndDate;
      }
    }

    let result: CursorPaginationResult<Attendance>;

    // At this point startDate & endDate are always defined
    result = await this.attendanceRepository.findByUserIdAndDateRange(
      command.userId,
      startDate as Date,
      endDate as Date,
      command.cursor,
      realLimit,
    );

    // Load statistics for the user
    const statistic = await this.statisticRepository.findByUserId(command.userId);
    if (statistic) {
      result.data.forEach((attendance) => {
        (attendance as any).currentStreak = statistic.currentStreak;
        (attendance as any).totalAttendanceDays = statistic.totalAttendanceDays;
      });
    }

    return result;
  }
}
