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
}
