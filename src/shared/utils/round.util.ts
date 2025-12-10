/**
 * Round calculation utility
 * Calculate current round based on time and interval
 */

export interface RoundStatusParams {
  now?: Date;
  intervalMinutes: number;
  baseHour?: number;
  baseMinute?: number;
  baseSecond?: number;
  roundsPerDay?: number;
}

export interface RoundStatus {
  now: string;
  baseDatetime: string;
  roundNumber: number;
  roundStart: string;
  roundEnd: string;
  status: 'not_started' | 'active' | 'finished';
  intervalMinutes: number;
  totalRoundsPerDay: number;
}

/**
 * Get timezone offset from environment variable
 * Default to +9 (Korea timezone) if not set or invalid
 * All round calculations are based on Korea timezone (+9) by default
 * @returns Timezone offset (defaults to 9 for Korea timezone)
 */
function getTimezoneOffset(): number {
  const tzOffset = process.env.TZ_OFFSET_FOR_ROUND;
  
  if (!tzOffset) {
    // Fallback to +9 (Korea timezone) if env not set
    return 9;
  }
  
  const offset = parseInt(tzOffset);
  
  if (isNaN(offset)) {
    // Fallback to +9 (Korea timezone) if invalid value
    console.warn(`Invalid TZ_OFFSET_FOR_ROUND value: ${tzOffset}, using default +9`);
    return 9;
  }
  
  return offset;
}

/**
 * Get current round status based on time and game interval
 * @param params - Round calculation parameters
 * @returns Round status information
 */
export function getRoundStatus({
  now = new Date(),
  intervalMinutes,
  baseHour = 0,
  baseMinute = 0,
  baseSecond = 0,
  roundsPerDay = null,
}: RoundStatusParams): RoundStatus {
  // Get timezone offset from environment
  const TZ_OFFSET = getTimezoneOffset();
  const TZ_OFFSET_MINUTES = TZ_OFFSET * 60;
  const n = new Date(now);

  // Get time in target timezone
  const utcTime = n; // Keep as Date object
  const utcTimeMs = utcTime.getTime(); // Get milliseconds for calculations
  const tzTime = new Date(utcTimeMs + TZ_OFFSET_MINUTES * 60 * 1000);

  // Helper to build Date for a given day at baseHour:baseMinute:baseSecond in target timezone
  const makeBase = (y: number, m: number, d: number) => {
    // Create date in target timezone
    const baseDate = new Date(
      Date.UTC(y, m, d, baseHour - TZ_OFFSET, baseMinute, baseSecond, 0),
    );
    return baseDate;
  };

  // Compute candidate base for today and yesterday in target timezone
  const tzYear = tzTime.getUTCFullYear();
  const tzMonth = tzTime.getUTCMonth();
  const tzDate = tzTime.getUTCDate();

  const baseToday = makeBase(tzYear, tzMonth, tzDate);
  const yesterday = new Date(baseToday.getTime() - 24 * 60 * 60 * 1000);
  const baseYesterday = makeBase(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
  );

  // Choose baseDatetime as the one <= now and closest to now
  // For continuous games (roundsPerDay < 288), this will be used as reference point
  // The wrap logic will handle calculating the correct cycle
  let baseDatetime: Date;
  if (baseToday.getTime() <= utcTimeMs) {
    baseDatetime = baseToday;
  } else {
    baseDatetime = baseYesterday;
  }
  
  // For normal games (288 or 480 rounds), handle day transitions
  // For continuous games, we skip this to allow continuous calculation
  if (!roundsPerDay || roundsPerDay >= 288) {
    // Special case: If we're in a new day (different date), always use today's base
    // This ensures new day always starts with round 1
    const currentDate = tzTime.getUTCDate();
    const baseDate = new Date(baseDatetime.getTime() + TZ_OFFSET_MINUTES * 60 * 1000).getUTCDate();
    
    if (currentDate !== baseDate) {
      // For new day, check if we're before the base time of the new day
      const newDayBaseTime = new Date(
        Date.UTC(tzYear, tzMonth, tzDate, baseHour - TZ_OFFSET, baseMinute, baseSecond, 0)
      );
      
      if (utcTimeMs < newDayBaseTime.getTime()) {
        // If we're before the base time of new day, use yesterday's base time
        baseDatetime = baseYesterday;
      } else {
        // If we're after the base time of new day, use new day's base time
        baseDatetime = newDayBaseTime;
      }
    }
  }
  
  const intervalMs = intervalMinutes * 60 * 1000;
  const elapsedMs = utcTimeMs - baseDatetime.getTime();

  // Calculate total rounds per day if not provided
  const totalRoundsPerDay =
    roundsPerDay || Math.floor((24 * 60) / intervalMinutes);

  // Calculate round number
  let roundNumber = Math.floor(elapsedMs / intervalMs) + 1;
  if (elapsedMs < 0) {
    roundNumber = 1;
  }

  // Wrap round number if it exceeds roundsPerDay (for games that don't run 24 hours)
  // This handles cases like NAMED_RBALL_56 and NAMED_RUNNINGBALL5_4 which only run 264 rounds
  // For games that run continuously (no break), calculate round based on continuous cycles
  let adjustedBaseDatetime = baseDatetime;
  
  // Only apply wrap logic for games that don't run 24 hours (roundsPerDay < 288)
  // AND when the calculated roundNumber exceeds roundsPerDay
  if (roundsPerDay && roundsPerDay < 288 && roundNumber > roundsPerDay) {
    // For games that run continuously (like NAMED_RBALL_56 with 264 rounds = 22 hours)
    // Calculate total elapsed time from the first baseDatetime (not reset each day)
    // Round number wraps: 1, 2, ..., 264, 1, 2, ..., 264, ...
    
    // Calculate total rounds from the first baseDatetime
    const totalRoundsFromStart = Math.floor(elapsedMs / intervalMs);
    
    // Calculate which cycle we're in (each cycle has roundsPerDay rounds)
    const cyclesPassed = Math.floor(totalRoundsFromStart / roundsPerDay);
    
    // Calculate round number within current cycle (1 to roundsPerDay)
    roundNumber = (totalRoundsFromStart % roundsPerDay) + 1;
    if (roundNumber === 0) {
      roundNumber = roundsPerDay;
    }
    
    // Calculate the baseDatetime for the current cycle
    // Each cycle is roundsPerDay * intervalMs long
    const cycleDurationMs = roundsPerDay * intervalMs;
    adjustedBaseDatetime = new Date(baseDatetime.getTime() + cyclesPassed * cycleDurationMs);
  }

  // Compute round start and end using adjusted baseDatetime
  let roundStart: Date;
  let roundEnd: Date;
  let status: 'not_started' | 'active' | 'finished';
  
  roundStart = new Date(
    adjustedBaseDatetime.getTime() + (roundNumber - 1) * intervalMs,
  );
  roundEnd = new Date(roundStart.getTime() + intervalMs);
  
  // Determine status
  if (utcTimeMs < roundStart.getTime()) {
    status = 'not_started';
  } else if (utcTimeMs >= roundStart.getTime() && utcTimeMs < roundEnd.getTime()) {
    status = 'active';
  } else {
    status = 'finished';
  }

  return {
    now: n.toISOString(),
    baseDatetime: adjustedBaseDatetime.toISOString(),
    roundNumber,
    roundStart: roundStart.toISOString(),
    roundEnd: roundEnd.toISOString(),
    status,
    intervalMinutes,
    totalRoundsPerDay,
  };
}

/**
 * Get round ID string
 * Handles special case: round 1 starts at 23:57:00 of previous day but belongs to new day
 * @param roundStatus - Round status information
 * @param gameName - Optional game name to check baseHour
 * @returns Round ID string (e.g., "20251013_032")
 */
export function getRoundId(
  roundStatus: RoundStatus,
  gameName?: keyof typeof GAME_CONFIGS,
): string {
  // Get timezone offset from environment
  const TZ_OFFSET = getTimezoneOffset();
  const TZ_OFFSET_MINUTES = TZ_OFFSET * 60;

  // Use roundStart to determine the actual date of the round
  // For round 1 that starts at 23:57, we need to check if it belongs to next day
  const roundStartTime = new Date(roundStatus.roundStart);

  // Calculate date from roundStart with timezone offset
  const roundStartTz = new Date(
    roundStartTime.getTime() + TZ_OFFSET_MINUTES * 60 * 1000,
  );
  
  let dateToUse: Date;
  if (roundStatus.roundNumber === 1 && gameName) {
    const config = GAME_CONFIGS[gameName];
    const hour = roundStartTz.getUTCHours();
    
    // For games that run continuously (roundsPerDay < 288)
    // Round 1 of a new cycle may start late at night but belongs to next day
    if (config && config.roundsPerDay && config.roundsPerDay < 288) {
      // If round 1 starts late at night (>= 23:00 or < 01:00), it belongs to next day
      if (hour >= 23 || hour < 1) {
        const nextDay = new Date(roundStartTz);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        dateToUse = nextDay;
      } else {
        dateToUse = roundStartTz;
      }
    }
    // For games with baseHour >= 23 (like NAMED_POWERBALL)
    // Round 1 starts at 23:57 of previous day but belongs to new day
    else if (config && 'baseHour' in config && config.baseHour >= 23) {
      if (hour >= 23 || hour < 1) {
        const nextDay = new Date(roundStartTz);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        dateToUse = nextDay;
      } else {
        dateToUse = roundStartTz;
      }
    } else {
      // Round 1 starts at normal time, use roundStart date
      dateToUse = roundStartTz;
    }
  } else {
    // For other rounds, use roundStart to get the correct date
    dateToUse = roundStartTz;
  }

  const year = dateToUse.getUTCFullYear();
  const month = String(dateToUse.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateToUse.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const roundStr = String(roundStatus.roundNumber).padStart(3, '0');
  return `${dateStr}_${roundStr}`;
}

/**
 * Predefined game configurations
 */
export const GAME_CONFIGS = {
  NAMED_POWERBALL: {
    name: 'Named Powerball',
    intervalMinutes: 5,
    baseHour: 23,
    baseMinute: 57,
    baseSecond: 0,
    roundsPerDay: 288, // 24 * 60 / 5
  },
  NAMED_POWERBALL3: {
    name: 'Named Powerball 3min',
    intervalMinutes: 3,
    baseHour: 23,
    baseMinute: 59,
    baseSecond: 35,
    roundsPerDay: 480, // 24 * 60 / 3
  },
  NAMED_POWERBALL5: {
    name: 'Named Powerball 5min',
    intervalMinutes: 5,
    baseHour: 23,
    baseMinute: 59,
    baseSecond: 35,
    roundsPerDay: 288, // 24 * 60 / 5
  },
  NAMED_POWERLADDER: {
    name: 'Named Powerladder',
    intervalMinutes: 5,
    baseHour: 23,
    baseMinute: 57,
    baseSecond: 0,
    roundsPerDay: 288, // 24 * 60 / 5
  },
  NAMED_POWERLADDER3: {
    name: 'Named Powerladder 3min',
    intervalMinutes: 3,
    baseHour: 23,
    baseMinute: 59,
    baseSecond: 35,
    roundsPerDay: 480, // 24 * 60 / 3
  },
  NAMED_POWERLADDER5: {
    name: 'Named Powerladder 5min',
    intervalMinutes: 5,
    baseHour: 23,
    baseMinute: 59,
    baseSecond: 35,
    roundsPerDay: 288, // 24 * 60 / 5
  },
  NAMED_RBALL_56: {
    name: 'Named Rball 56',
    intervalMinutes: 5,
    roundsPerDay: 264, // 22 hours * 60 / 5 = 264 rounds per day, runs continuously (no break)
  },
  NAMED_RUNNINGBALL5_4: {
    name: 'Named Runningball5_4',
    intervalMinutes: 5,
    roundsPerDay: 264, // 22 hours * 60 / 5 = 264 rounds per day, runs continuously (no break)
  },
  NAMED_RUNNINGBALL3: {
    name: 'Named Runningball3',
    intervalMinutes: 5,
    roundsPerDay: 264, // 22 hours * 60 / 5 = 264 rounds per day, runs continuously (no break)
  },
  NAMED_SPACE8: {
    name: 'Named Space8',
    intervalMinutes: 3,
    roundsPerDay: 440, // 22 hours * 60 / 3 = 440 rounds per day, runs continuously (no break)
  },
  NAMED_HOLDEM: {
    name: 'Named Holdem',
    intervalMinutes: 3,
    baseHour: 0,
    baseMinute: 0,
    baseSecond: 0,
    roundsPerDay: 480, // 24 hours * 60 / 3 = 480 rounds per day
  },
};

/**
 * Get round status for a specific game
 * @param gameName - Game name from GAME_CONFIGS
 * @param now - Current time (optional)
 * @returns Round status
 */
export function getGameRoundStatus(
  gameName: keyof typeof GAME_CONFIGS,
  now?: Date,
): RoundStatus {
  const config = GAME_CONFIGS[gameName];
  if (!config) {
    throw new Error(`Game config not found: ${gameName}`);
  }

  return getRoundStatus({
    now,
    intervalMinutes: config.intervalMinutes,
    baseHour: 'baseHour' in config ? config.baseHour : undefined,
    baseMinute: 'baseMinute' in config ? config.baseMinute : undefined,
    baseSecond: 'baseSecond' in config ? config.baseSecond : undefined,
    roundsPerDay: config.roundsPerDay,
  });
}

/**
 * Get round status for a specific round number on a specific date
 * This is useful when you need to calculate round status for rounds from previous day
 * @param gameName - Game name from GAME_CONFIGS
 * @param roundNumber - Round number (1-288 or 1-480)
 * @param targetDate - Target date to calculate round for
 * @returns Round status for that round
 */
export function getRoundStatusForRoundNumber(
  gameName: keyof typeof GAME_CONFIGS,
  roundNumber: number,
  targetDate: Date,
): RoundStatus {
  const config = GAME_CONFIGS[gameName];
  if (!config) {
    throw new Error(`Game config not found: ${gameName}`);
  }

  const intervalMs = config.intervalMinutes * 60 * 1000;
  
  // Get round status for the target date to get baseDatetime
  const dayRoundStatus = getRoundStatus({
    now: targetDate,
    intervalMinutes: config.intervalMinutes,
    baseHour: 'baseHour' in config ? config.baseHour : undefined,
    baseMinute: 'baseMinute' in config ? config.baseMinute : undefined,
    baseSecond: 'baseSecond' in config ? config.baseSecond : undefined,
    roundsPerDay: config.roundsPerDay,
  });

  let baseDatetime = new Date(dayRoundStatus.baseDatetime);
  let adjustedRoundNumber = roundNumber;
  
  // For games that run continuously (roundsPerDay < 288), handle wrap logic
  if (config.roundsPerDay && config.roundsPerDay < 288) {
    // Wrap round number to valid range (1 to roundsPerDay)
    if (roundNumber > config.roundsPerDay) {
      adjustedRoundNumber = ((roundNumber - 1) % config.roundsPerDay) + 1;
      
      // Calculate how many cycles have passed
      const cyclesPassed = Math.floor((roundNumber - 1) / config.roundsPerDay);
      const cycleDurationMs = config.roundsPerDay * intervalMs;
      
      // Adjust baseDatetime to the correct cycle
      baseDatetime = new Date(baseDatetime.getTime() + cyclesPassed * cycleDurationMs);
    } else if (roundNumber < 1) {
      adjustedRoundNumber = 1;
    }
  }
  
  // Calculate round start and end for the specific round number
  const roundStart = new Date(baseDatetime.getTime() + (adjustedRoundNumber - 1) * intervalMs);
  const roundEnd = new Date(roundStart.getTime() + intervalMs);

  return {
    now: targetDate.toISOString(),
    baseDatetime: baseDatetime.toISOString(),
    roundNumber: adjustedRoundNumber,
    roundStart: roundStart.toISOString(),
    roundEnd: roundEnd.toISOString(),
    status: 'finished', // Historical rounds are always finished
    intervalMinutes: config.intervalMinutes,
    totalRoundsPerDay: config.roundsPerDay,
  };
}

/**
 * Calculate round time for a given round number relative to current round
 * Handles special cases when transitioning from previous day (last round) to new day (round 1)
 * Uses getRoundStatusForRoundNumber internally for accurate date handling
 * @param gameName - Game name from GAME_CONFIGS
 * @param roundNumber - Round number from data (can be from previous day)
 * @param currentRoundNumber - Current round number
 * @param currentRoundStatus - Current round status
 * @param intervalMs - Interval in milliseconds
 * @param roundsPerDay - Total rounds per day
 * @returns Date object representing the round start time
 */
/**
 * Calculate round status for a given round number relative to current round
 * Returns full RoundStatus instead of just Date to avoid recalculating baseDatetime
 * @param gameName - Game name from GAME_CONFIGS
 * @param roundNumber - Round number from data (can be from previous day)
 * @param currentRoundNumber - Current round number
 * @param currentRoundStatus - Current round status
 * @param intervalMs - Interval in milliseconds
 * @param roundsPerDay - Total rounds per day
 * @returns RoundStatus object with correct baseDatetime and roundStart
 */
export function calculateRoundStatus(
  gameName: keyof typeof GAME_CONFIGS,
  roundNumber: number,
  currentRoundNumber: number,
  currentRoundStatus: RoundStatus,
  intervalMs: number,
  roundsPerDay: number,
): RoundStatus {
  let roundStatus: RoundStatus;

  // Special handling when current round is 1 (new day started)
  if (currentRoundNumber === 1) {
    if (roundNumber === roundsPerDay) {
      // Last round (288 or 480) is from previous day - calculate from yesterday
      const currentRoundStart = new Date(currentRoundStatus.roundStart);
      const yesterday = new Date(currentRoundStart.getTime() - 24 * 60 * 60 * 1000);
      roundStatus = getRoundStatusForRoundNumber(gameName, roundNumber, yesterday);
    } else if (roundNumber === 1) {
      // Round 1 is from current/new day - use current round status baseDatetime
      roundStatus = getRoundStatusForRoundNumber(gameName, roundNumber, new Date(currentRoundStatus.roundStart));
    } else {
      // RoundNumber > 1 but < roundsPerDay when currentRoundNumber = 1
      // This means it's from previous day (shouldn't normally happen, but handle it)
      const currentRoundStart = new Date(currentRoundStatus.roundStart);
      const yesterday = new Date(currentRoundStart.getTime() - 24 * 60 * 60 * 1000);
      roundStatus = getRoundStatusForRoundNumber(gameName, roundNumber, yesterday);
    }
  } else {
    // currentRoundNumber > 1
    // Check if round is from previous day (roundNumber > currentRoundNumber && roundNumber <= roundsPerDay)
    if (roundNumber > currentRoundNumber && roundNumber <= roundsPerDay) {
      // Round is from previous day (e.g., currentRoundNumber=38, roundNumber=288/480)
      // Calculate from yesterday relative to current round
      const currentRoundStart = new Date(currentRoundStatus.roundStart);
      const yesterday = new Date(currentRoundStart.getTime() - 24 * 60 * 60 * 1000);
      roundStatus = getRoundStatusForRoundNumber(gameName, roundNumber, yesterday);
    } else if (roundNumber < currentRoundNumber) {
      // Rounds from current day that have ended (roundNumber < currentRoundNumber)
      // Calculate baseDatetime of current day from currentRoundStatus.roundStart
      // by subtracting the elapsed rounds: baseDatetime = roundStart - (currentRoundNumber - 1) * intervalMs
      const currentRoundStart = new Date(currentRoundStatus.roundStart);
      const currentDayBaseDatetime = new Date(currentRoundStart.getTime() - (currentRoundNumber - 1) * intervalMs);
      roundStatus = getRoundStatusForRoundNumber(gameName, roundNumber, currentDayBaseDatetime);
    } else {
      // This shouldn't happen if filtering is correct, but handle it anyway
      // roundNumber >= currentRoundNumber but not from previous day - treat as current day
      const currentRoundStart = new Date(currentRoundStatus.roundStart);
      roundStatus = getRoundStatusForRoundNumber(gameName, roundNumber, currentRoundStart);
    }
  }

  return roundStatus;
}
