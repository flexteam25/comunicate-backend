/**
 * Utility functions for attendance date handling
 * All attendance dates are based on Korea Standard Time (KST, UTC+9)
 */

/**
 * Get today's date in Korea Standard Time (KST, UTC+9)
 * Converts current UTC datetime to KST (+9) and returns the date part
 * @returns Date object representing today at 00:00:00 UTC, but the date value is the KST date
 *
 * Example:
 * - UTC: 2024-01-01 15:00:00 UTC (3 PM UTC)
 * - KST: 2024-01-02 00:00:00 KST (midnight next day in KST)
 * - Returns: Date object for 2024-01-02 00:00:00 UTC (representing KST date 2024-01-02)
 */
export function getTodayInKST(): Date {
  const now = new Date();

  // Get UTC components
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const utcHours = now.getUTCHours();

  // Calculate KST date
  // KST is UTC+9, so we need to add 9 hours to UTC time
  // If UTC hour + 9 >= 24, it's the next day in KST
  let kstYear = utcYear;
  let kstMonth = utcMonth;
  let kstDate = utcDate;

  const kstHours = utcHours + 9;
  if (kstHours >= 24) {
    // Next day in KST
    const nextDay = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1));
    kstYear = nextDay.getUTCFullYear();
    kstMonth = nextDay.getUTCMonth();
    kstDate = nextDay.getUTCDate();
  }

  // Return date at 00:00:00 UTC representing the KST date
  return new Date(Date.UTC(kstYear, kstMonth, kstDate, 0, 0, 0, 0));
}

/**
 * Get a specific date in Korea Standard Time (KST, UTC+9)
 * @param date - Date to convert (will be treated as UTC)
 * @returns Date object representing the date at 00:00:00 UTC, but the date value is the KST date
 */
export function getDateInKST(date: Date): Date {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDate = date.getUTCDate();
  const utcHours = date.getUTCHours();

  let kstYear = utcYear;
  let kstMonth = utcMonth;
  let kstDate = utcDate;

  const kstHours = utcHours + 9;
  if (kstHours >= 24) {
    const nextDay = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1));
    kstYear = nextDay.getUTCFullYear();
    kstMonth = nextDay.getUTCMonth();
    kstDate = nextDay.getUTCDate();
  }

  return new Date(Date.UTC(kstYear, kstMonth, kstDate, 0, 0, 0, 0));
}

/**
 * Get yesterday's date in Korea Standard Time (KST, UTC+9)
 * @returns Date object representing yesterday at 00:00:00 UTC, but the date value is the KST date
 */
export function getYesterdayInKST(): Date {
  const today = getTodayInKST();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday;
}
