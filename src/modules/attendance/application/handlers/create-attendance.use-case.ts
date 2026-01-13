import { Inject, Injectable } from '@nestjs/common';
import { IAttendanceRepository } from '../../infrastructure/persistence/repositories/attendance.repository';
import { IAttendanceStatisticRepository } from '../../infrastructure/persistence/repositories/attendance-statistic.repository';
import { Attendance } from '../../domain/entities/attendance.entity';
import {
  getTodayInKST,
  getYesterdayInKST,
} from '../../../../shared/utils/attendance-date.util';
import {
  badRequest,
  conflict,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { EntityManager } from 'typeorm';
import { AttendanceStatistic } from '../../domain/entities/attendance-statistic.entity';

export interface CreateAttendanceCommand {
  userId: string;
  message?: string;
}

export interface CreateAttendanceResult {
  attendance: Attendance;
  currentStreak: number;
  totalAttendanceDays: number;
  attendanceRank: number;
}

@Injectable()
export class CreateAttendanceUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
    @Inject('IAttendanceStatisticRepository')
    private readonly statisticRepository: IAttendanceStatisticRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateAttendanceCommand): Promise<CreateAttendanceResult> {
    // Validate message length
    if (command.message && command.message.length > 20) {
      throw badRequest(MessageKeys.MESSAGE_EXCEEDS_LIMIT, { maxLength: 20 });
    }

    // Get today's date in KST (+9 timezone)
    const today = getTodayInKST();
    const yesterday = getYesterdayInKST();

    // Execute in transaction to ensure atomicity and accurate rank calculation
    return await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Check if user already checked in today (within transaction)
        const existing = await manager.getRepository(Attendance).findOne({
          where: {
            userId: command.userId,
            attendanceDate: today,
          },
        });
        if (existing) {
          throw conflict(MessageKeys.ALREADY_CHECKED_IN_TODAY);
        }

        // Get yesterday's statistic for this user
        const yesterdayStat = await manager.getRepository(AttendanceStatistic).findOne({
          where: {
            userId: command.userId,
            statisticDate: yesterday,
          },
        });

        // Calculate total attendance days
        const totalAttendanceDays = (yesterdayStat?.totalAttendanceDays || 0) + 1;

        // Calculate current streak
        let currentStreak: number;
        if (yesterdayStat && yesterdayStat.currentStreak > 0) {
          currentStreak = yesterdayStat.currentStreak + 1;
        } else {
          currentStreak = 1;
        }

        // Count existing statistics for today (within transaction) to calculate accurate rank
        const existingStatsCount = await manager
          .getRepository(AttendanceStatistic)
          .count({
            where: {
              statisticDate: today,
            },
          });
        const attendanceRank = existingStatsCount + 1; // +1 because this user is the next one

        // Create attendance
        const attendance = manager.getRepository(Attendance).create({
          userId: command.userId,
          message: command.message?.trim() || undefined,
          attendanceDate: today,
        });
        const savedAttendance = await manager.getRepository(Attendance).save(attendance);

        // Save statistics immediately
        const statistic = manager.getRepository(AttendanceStatistic).create({
          userId: command.userId,
          statisticDate: today,
          totalAttendanceDays,
          currentStreak,
          attendanceTime: savedAttendance.createdAt,
          attendanceRank,
          dailyMessage: savedAttendance.message,
        });
        await manager.getRepository(AttendanceStatistic).save(statistic);

        return {
          attendance: savedAttendance,
          currentStreak,
          totalAttendanceDays,
          attendanceRank,
        };
      },
    );
  }
}
