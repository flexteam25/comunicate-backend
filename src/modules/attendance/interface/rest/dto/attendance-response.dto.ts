export class AttendanceResponse {
  rankByTime?: number;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  message?: string;
  attendanceTime: Date;
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
