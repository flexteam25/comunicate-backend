import {
  Inject,
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { IAttendanceRepository } from '../../infrastructure/persistence/repositories/attendance.repository';
import { Attendance } from '../../domain/entities/attendance.entity';
import { getTodayInKST } from '../../../../shared/utils/attendance-date.util';

export interface CreateAttendanceCommand {
  userId: string;
  message?: string;
}

@Injectable()
export class CreateAttendanceUseCase {
  constructor(
    @Inject('IAttendanceRepository')
    private readonly attendanceRepository: IAttendanceRepository,
  ) {}

  async execute(command: CreateAttendanceCommand): Promise<Attendance> {
    // Validate message length
    if (command.message && command.message.length > 20) {
      throw new BadRequestException('Message cannot exceed 20 characters');
    }

    // Get today's date in KST (+9 timezone)
    const today = getTodayInKST();

    // Check if user already checked in today (based on KST date)
    const existing = await this.attendanceRepository.findByUserAndDate(
      command.userId,
      today,
    );
    if (existing) {
      throw new ConflictException('Already checked in today');
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
