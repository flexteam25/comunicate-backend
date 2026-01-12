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

export interface CreateAttendanceCommand {
  userId: string;
  message?: string;
}

@Injectable()
export class CreateAttendanceUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
    @Inject('IAttendanceStatisticRepository')
    private readonly statisticRepository: IAttendanceStatisticRepository,
  ) {}

  async execute(command: CreateAttendanceCommand): Promise<Attendance> {
    // Validate message length
    if (command.message && command.message.length > 20) {
      throw badRequest(MessageKeys.MESSAGE_EXCEEDS_LIMIT, { maxLength: 20 });
    }

    // Get today's date in KST (+9 timezone)
    const today = getTodayInKST();
    const yesterday = getYesterdayInKST();

    // Check if user already checked in today (based on KST date)
    const existing = await this.attendanceRepository.findByUserAndDate(
      command.userId,
      today,
    );
    if (existing) {
      throw conflict(MessageKeys.ALREADY_CHECKED_IN_TODAY);
    }

    // Create attendance
    const attendance = await this.attendanceRepository.create({
      userId: command.userId,
      message: command.message?.trim() || undefined,
      attendanceDate: today,
    });

    return attendance;
  }
}
