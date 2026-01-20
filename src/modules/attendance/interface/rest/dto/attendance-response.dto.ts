export class AttendanceResponse {
  filterRank?: number; // Rank in the current list (based on filter: today/streak/total)
  overviewRank?: number; // Rank for today based on total/streak
  userId: string;
  nickname: string;
  avatarUrl?: string;
  message?: string;
  attendanceTime: string; // Formatted as "YYYY-MM-DD HH:mm:ss +09:00"
  currentStreak: number;
  totalAttendanceDays: number;
}

export class ListAttendancesResponse {
  totalCount?: number;
  data: AttendanceResponse[];
  nextCursor: string | null;
  hasMore: boolean;
  /**
   * Current user's attendance status for today (when auth token is provided):
   * - true: current user has attended today
   * - false: current user has NOT attended today
   * - null: no auth / unknown
   */
  attended: boolean | null;
}
