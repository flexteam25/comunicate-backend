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

        // Create attendance first to get createdAt
        const attendance = manager.getRepository(Attendance).create({
          userId: command.userId,
          message: command.message?.trim() || undefined,
          attendanceDate: today,
        });
        const savedAttendance = await manager.getRepository(Attendance).save(attendance);

        // Calculate rank based on total and streak for today
        // Priority: total DESC, streak DESC, attendanceTime ASC (earlier = better)
        const todayStats = await manager.getRepository(AttendanceStatistic).find({
          where: {
            statisticDate: today,
          },
          order: {
            totalAttendanceDays: 'DESC',
            currentStreak: 'DESC',
            attendanceTime: 'ASC',
          },
        });

        // Calculate rank: count how many users have better stats
        // Priority: total DESC, streak DESC, attendanceTime ASC (earlier = better)
        let attendanceRank = 1;
        for (const stat of todayStats) {
          // Compare total first
          if (stat.totalAttendanceDays > totalAttendanceDays) {
            attendanceRank++;
            continue;
          }
          if (stat.totalAttendanceDays < totalAttendanceDays) {
            break; // Since sorted, we can break early
          }
          // If total is equal, compare streak
          if (stat.currentStreak > currentStreak) {
            attendanceRank++;
            continue;
          }
          if (stat.currentStreak < currentStreak) {
            break; // Since sorted, we can break early
          }
          // If both total and streak are equal, compare attendanceTime (earlier = better)
          if (
            stat.attendanceTime &&
            savedAttendance.createdAt &&
            stat.attendanceTime < savedAttendance.createdAt
          ) {
            attendanceRank++;
          } else {
            break; // Since sorted, we can break early
          }
        }

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

        // Recalculate ranks for all users of today (including the new user)
        // This ensures all ranks are correct after new user joins
        const allTodayStats = await manager.getRepository(AttendanceStatistic).find({
          where: {
            statisticDate: today,
          },
          order: {
            totalAttendanceDays: 'DESC',
            currentStreak: 'DESC',
            attendanceTime: 'ASC',
          },
        });

        // Update ranks for all users
        for (let i = 0; i < allTodayStats.length; i++) {
          const stat = allTodayStats[i];
          const newRank = i + 1; // 1-based rank

          // Only update if rank changed
          if (stat.attendanceRank !== newRank) {
            await manager
              .getRepository(AttendanceStatistic)
              .update(stat.id, { attendanceRank: newRank });
          }
        }

        // Get the final rank for the new user
        const finalStat = await manager.getRepository(AttendanceStatistic).findOne({
          where: {
            userId: command.userId,
            statisticDate: today,
          },
        });

        return {
          attendance: savedAttendance,
          currentStreak,
          totalAttendanceDays,
          attendanceRank: finalStat?.attendanceRank || attendanceRank,
        };
      },
    );
  }
}
