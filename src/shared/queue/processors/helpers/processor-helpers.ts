/**
 * Helper functions for minigame socket data processor
 * Contains common utilities to reduce code duplication
 */

import { RoundStatus, calculateRoundStatus } from '../../../utils/round.util';

export interface GameProcessorConfig {
  gameKey: keyof typeof import('../../../utils/round.util').GAME_CONFIGS;
  gameName: string; // database game name (e.g., 'named_powerball')
  service: any; // RoundService instance
  roundsPerDay: number;
}

/**
 * Extract rounds data from various data structures
 */
export function extractRoundsData(data: any, provider: string): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data && typeof data === 'object') {
    // Handle structure: { PROVIDER: { data: [...] } }
    if (data[provider] && data[provider].data) {
      return data[provider].data;
    }
  }
  
  return [];
}

/**
 * Filter rounds for processing with smart logic:
 * - Limit previous rounds from current day (< currentRoundNumber) to max 10 items
 * - Always include all rounds from previous day (> currentRoundNumber && <= roundsPerDay)
 * - Always include the last round of previous day (round === roundsPerDay)
 * - Always include the round immediately preceding currentRoundNumber
 */
export function filterRoundsForProcessing(
  data: any[],
  currentRoundNumber: number,
  roundsPerDay: number,
  parseRoundNumber: (item: any) => number = (item) => parseInt(item.date_round),
): any[] {
  const previousDayRounds: any[] = [];
  const currentDayPreviousRounds: any[] = [];
  
  data.forEach((item) => {
    const roundNum = parseRoundNumber(item);
    
    // Always include the last round of previous day
    if (roundNum === roundsPerDay) {
      previousDayRounds.push(item);
      return;
    }
    
    // Rounds from previous day (> currentRoundNumber && <= roundsPerDay)
    if (roundNum > currentRoundNumber && roundNum <= roundsPerDay) {
      previousDayRounds.push(item);
      return;
    }
    
    // Rounds from current day that have ended (< currentRoundNumber)
    if (roundNum < currentRoundNumber) {
      currentDayPreviousRounds.push(item);
      return;
    }
  });
  
  // Sort current day previous rounds by round number (descending)
  currentDayPreviousRounds.sort((a, b) => parseRoundNumber(b) - parseRoundNumber(a));
  
  // Limit to max 10 items, but ensure the round immediately preceding currentRoundNumber is included
  const limitedCurrentDayRounds = currentDayPreviousRounds.slice(0, 10);
  const previousRoundNumber = currentRoundNumber - 1;
  const previousRoundExists = limitedCurrentDayRounds.some(
    item => parseRoundNumber(item) === previousRoundNumber
  );
  
  if (!previousRoundExists && previousRoundNumber >= 1) {
    // Find and add the previous round if it exists
    const previousRound = currentDayPreviousRounds.find(
      item => parseRoundNumber(item) === previousRoundNumber
    );
    if (previousRound) {
      limitedCurrentDayRounds.push(previousRound);
    }
  }
  
  // Combine: previous day rounds + limited current day rounds
  const result = [...previousDayRounds, ...limitedCurrentDayRounds];
  
  // Sort by round number (descending) for consistent processing
  result.sort((a, b) => parseRoundNumber(b) - parseRoundNumber(a));
  
  return result;
}

/**
 * Create batch data for powerball rounds
 * Uses calculateRoundStatus directly to ensure correct baseDatetime calculation
 */
export function createPowerballBatchData(
  roundsData: any[],
  currentRoundNumber: number,
  currentRoundStatus: RoundStatus,
  config: {
    gameKey: keyof typeof import('../../../utils/round.util').GAME_CONFIGS;
    intervalMs: number;
    roundsPerDay: number;
    parseRoundNumber: (item: any) => number;
    getRoundStatus: (gameKey: any, time: Date) => RoundStatus;
    getRoundId: (status: RoundStatus, gameKey?: keyof typeof import('../../../utils/round.util').GAME_CONFIGS) => string;
  },
): any[] {
  return roundsData.map((roundData) => {
    const roundNumber = config.parseRoundNumber(roundData);

    // Use calculateRoundStatus directly to get correct baseDatetime
    // This ensures baseDatetime is calculated correctly for rounds starting early (23:57)
    const roundStatus = calculateRoundStatus(
      config.gameKey,
      roundNumber,
      currentRoundNumber,
      currentRoundStatus,
      config.intervalMs,
      config.roundsPerDay,
    );
    const roundId = config.getRoundId(roundStatus, config.gameKey);

    return {
      round_day: roundId,
      round_number: roundNumber,
      game_name: config.gameKey,
      ball_1: parseInt(roundData.ball_1),
      ball_2: parseInt(roundData.ball_2),
      ball_3: parseInt(roundData.ball_3),
      ball_4: parseInt(roundData.ball_4),
      ball_5: parseInt(roundData.ball_5),
      powerball: parseInt(roundData.powerball),
      powerball_odd_even: roundData.powerball_odd_even, // Raw: EVEN/ODD or 홀/짝
      powerball_under_over: roundData.powerball_unover, // Raw: EVEN_OVER/ODD_UNDER or 언더/오버
      sum: parseInt(roundData.sum),
      sum_odd_even: roundData.sum_odd_even, // Raw: EVEN/ODD or 홀/짝
      sum_size: roundData.sum_size, // Raw: SMALL/MEDIUM/LARGE or 소/중/대
      sum_under_over: roundData.sum_unover, // Raw: UNDER/OVER or 언더/오버
      result_time: new Date(roundStatus.roundEnd),
    };
  });
}

/**
 * Calculate round start/end time from existing rounds in database
 * Used for continuous games (NAMED_RBALL_56, NAMED_RUNNINGBALL5_4)
 */
export function calculateRoundTimeFromExisting(
  existingRounds: any[],
  currentRoundNumberFromSocket: number,
  roundsPerDay: number,
  intervalMs: number,
): { startTime: Date; endTime: Date } | null {
  if (existingRounds.length === 0) {
    return null;
  }

  const latestExistingRound = existingRounds[0];
  const latestExistingRoundId = latestExistingRound.round || '';
  const latestExistingRoundNumber = parseInt(latestExistingRoundId.split('_')[1] || '0');

  if (!latestExistingRound.startDatetime) {
    return null;
  }

  // Calculate how many rounds have passed since the latest existing round
  const roundsSinceLatest = currentRoundNumberFromSocket - latestExistingRoundNumber;

  // Handle wrap around (e.g., latest is 264, current is 1)
  let actualRoundsSinceLatest = roundsSinceLatest;
  if (roundsSinceLatest < -roundsPerDay / 2) {
    // Current round is in next cycle
    actualRoundsSinceLatest = roundsSinceLatest + roundsPerDay;
  } else if (roundsSinceLatest > roundsPerDay / 2) {
    // Current round is in previous cycle
    actualRoundsSinceLatest = roundsSinceLatest - roundsPerDay;
  }

  // Calculate current round start time from latest existing round
  const startTime = new Date(latestExistingRound.startDatetime.getTime() + actualRoundsSinceLatest * intervalMs);
  const endTime = new Date(startTime.getTime() + intervalMs);

  return { startTime, endTime };
}

/**
 * Calculate round start/end time from current time
 * Used as fallback when no existing rounds are found
 */
export function calculateRoundTimeFromCurrent(
  now: Date,
  intervalMs: number,
  resultDelayMs: number = 2 * 60 * 1000, // 2 minutes default
): { startTime: Date; endTime: Date } {
  const nowMs = now.getTime();
  const roundStartTimeMs = nowMs - resultDelayMs;
  const startTime = new Date(Math.floor(roundStartTimeMs / intervalMs) * intervalMs);
  const endTime = new Date(startTime.getTime() + intervalMs);

  return { startTime, endTime };
}

/**
 * Create round ID from start time (in Korea timezone)
 */
export function createRoundIdFromStartTime(
  startTime: Date,
  roundNumber: number,
  tzOffset: number = 9,
): string {
  const TZ_OFFSET_MS = tzOffset * 60 * 60 * 1000;
  const roundStartKorea = new Date(startTime.getTime() + TZ_OFFSET_MS);
  const year = roundStartKorea.getUTCFullYear();
  const month = String(roundStartKorea.getUTCMonth() + 1).padStart(2, '0');
  const day = String(roundStartKorea.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const roundStr = String(roundNumber).padStart(3, '0');
  return `${dateStr}_${roundStr}`;
}
