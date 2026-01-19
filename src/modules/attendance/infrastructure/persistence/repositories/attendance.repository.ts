import { Attendance } from '../../../domain/entities/attendance.entity';

export interface IAttendanceRepository {
  create(attendance: Partial<Attendance>): Promise<Attendance>;
  findByUserAndDate(userId: string, date: Date): Promise<Attendance | null>;
  findByDate(
    date: Date,
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: Attendance[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  findAllByDate(date: Date): Promise<Attendance[]>; // Get all attendances for a date (for statistics calculation)
  countByDate(date: Date): Promise<number>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    cursor?: string,
    limit?: number,
    search?: string,
  ): Promise<{
    data: Attendance[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    cursor?: string,
    limit?: number,
  ): Promise<{
    data: Attendance[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
}
