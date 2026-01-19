export class AdminAttendanceResponse {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  message?: string;
  attendanceDate: Date;
  attendanceTime: Date;
  currentStreak?: number;
  totalAttendanceDays?: number;
}

export class AdminListAttendancesResponse {
  data: AdminAttendanceResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class AdminUserAttendanceResponse {
  data: AdminAttendanceResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}
