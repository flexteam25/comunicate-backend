import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MinigameSocketDataJobData, QueueService } from '../queue.service';
import { PowerballRoundService } from '../../../domains/game/services/powerball-round.service';
import { Powerball3RoundService } from '../../../domains/game/services/powerball3-round.service';
import { Powerball5RoundService } from '../../../domains/game/services/powerball5-round.service';
import { PowerladderRoundService } from '../../../domains/game/services/powerladder-round.service';
import { Powerladder3RoundService } from '../../../domains/game/services/powerladder3-round.service';
import { Powerladder5RoundService } from '../../../domains/game/services/powerladder5-round.service';
import { Rball56RoundService } from '../../../domains/game/services/rball56-round.service';
import { Runningball54RoundService } from '../../../domains/game/services/runningball54-round.service';
import { Runningball3RoundService } from '../../../domains/game/services/runningball3-round.service';
import { Space8RoundService } from '../../../domains/game/services/space8-round.service';
import { HoldemRoundService } from '../../../domains/game/services/holdem-round.service';
import { MinigameRoundService } from '../../../domains/game/services/minigame-round.service';
import { GameConfigService } from '../../../domains/game/services/game-config.service';
import {
  getGameRoundStatus,
  getRoundId,
  calculateRoundStatus,
  getRoundStatusForRoundNumber,
  GAME_CONFIGS,
} from '../../../shared/utils/round.util';
import { LoggerService } from '../../logger/logger.service';
import { RedisService } from '../../redis/redis.service';
import {
  extractRoundsData,
  filterRoundsForProcessing,
  createPowerballBatchData,
  createRoundIdFromStartTime,
} from './helpers/processor-helpers';

interface RoundData {
  date_round: string;
  ball_1?: string;
  ball_2?: string;
  ball_3?: string;
  ball_4?: string;
  ball_5?: string;
  powerball?: string;
  powerball_odd_even?: string;
  powerball_odd_even_under_over?: string;
  powerball_unover?: string;
  sum?: string;
  winner_player?: string | null;
  winner_combo?: string | null;
  sum_odd_even: string;
  sum_odd_even_size: string;
  sum_odd_even_under_over: string;
  sum_size: string;
  sum_unover: string;
}

@Processor('minigame-socket-data-handle')
export class MinigameSocketDataProcessor extends WorkerHost {
  constructor(
    private readonly powerballRoundService: PowerballRoundService,
    private readonly powerball3RoundService: Powerball3RoundService,
    private readonly powerball5RoundService: Powerball5RoundService,
    private readonly powerladderRoundService: PowerladderRoundService,
    private readonly powerladder3RoundService: Powerladder3RoundService,
    private readonly powerladder5RoundService: Powerladder5RoundService,
    private readonly rball56RoundService: Rball56RoundService,
    private readonly runningball54RoundService: Runningball54RoundService,
    private readonly runningball3RoundService: Runningball3RoundService,
    private readonly space8RoundService: Space8RoundService,
    private readonly holdemRoundService: HoldemRoundService,
    private readonly minigameRoundService: MinigameRoundService,
    private readonly gameConfigService: GameConfigService,
    private readonly logger: LoggerService,
    private readonly redisService: RedisService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  /**
   * Get waiting round number from Redis cache
   * Cache stores the round number we're waiting for results
   */
  private async getWaitingRound(gameName: string): Promise<number | null> {
    try {
      const cacheKey = `minigame:waiting_round:${gameName}`;
      const cachedValue = (await this.redisService.get(cacheKey)) as string;
      return cachedValue ? parseInt(String(cachedValue), 10) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to get waiting round from cache for ${gameName}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'MinigameSocketDataProcessor',
      );
      return null;
    }
  }

  /**
   * Set waiting round number to Redis cache
   */
  private async setWaitingRound(gameName: string, roundNumber: number): Promise<void> {
    try {
      const cacheKey = `minigame:waiting_round:${gameName}`;
      // Cache for 2 minutes (120 seconds) - short TTL to ensure accurate timing
      await this.redisService.set(cacheKey, String(roundNumber), 120);
    } catch (error) {
      this.logger.warn(
        `Failed to set waiting round to cache for ${gameName}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Compare two round numbers considering wrap-around
   * Returns: 1 if round1 > round2, -1 if round1 < round2, 0 if equal
   * Handles wrap-around (e.g., round 264 vs round 1)
   */
  private compareRounds(round1: number, round2: number, roundsPerDay: number): number {
    if (round1 === round2) return 0;

    // Handle wrap-around: if difference is > half of roundsPerDay, consider wrap
    const diff = round1 - round2;
    if (Math.abs(diff) > roundsPerDay / 2) {
      // Wrap-around case
      if (diff > 0) {
        // round1 is actually before round2 (wrap-around)
        return -1;
      } else {
        // round2 is actually before round1 (wrap-around)
        return 1;
      }
    }
    // Normal case
    return diff > 0 ? 1 : -1;
  }

  /**
   * Calculate next round number with wrap-around
   */
  private getNextRoundNumber(currentRound: number, roundsPerDay: number): number {
    const next = currentRound + 1;
    return next > roundsPerDay ? 1 : next;
  }

  /**
   * Publish previous round result with retry mechanism
   * Retries if data is not yet available in database
   */
  private async publishPreviousRoundResultWithRetry(
    publishFn: (roundNumber: number) => Promise<string | null | void>,
    roundNumber: number,
    gameName: string,
    maxRetries: number = 10,
    retryDelayMs: number = 3000, // Default 3 seconds between retries
  ): Promise<string | null> {
    let retries = 0;
    let lastError: Error | null = null;

    while (retries < maxRetries) {
      try {
        const result = await publishFn(roundNumber);
        // If no error, data was found and published successfully
        // If result is string, return it; otherwise return null
        return typeof result === 'string' ? result : null;
      } catch (error) {
        lastError = error as Error;
        retries++;

        if (retries < maxRetries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          this.logger.debug(
            `Retrying publish previous round result for ${gameName}, round ${roundNumber}, attempt ${retries + 1}/${maxRetries}`,
            {},
            'MinigameSocketDataProcessor',
          );
        }
      }
    }

    // All retries exhausted
    this.logger.warn(
      `Failed to publish previous round result for ${gameName} after ${maxRetries} retries`,
      {
        roundNumber,
        gameName,
        lastError: lastError?.message,
      },
      'MinigameSocketDataProcessor',
    );
    return null;
  }

  async process(job: Job<MinigameSocketDataJobData>): Promise<any> {
    const { provider, data, timestamp } = job.data;

    try {
      const roundsData = extractRoundsData(data, provider);

      if (roundsData.length === 0) {
        this.logger.warn(
          `No valid data array for provider: ${provider}`,
          { dataType: typeof data, isArray: Array.isArray(data) },
          'MinigameProcessor',
        );
        return { success: true, provider };
      }

      // Use timestamp from job if available, otherwise use current time
      // Note: timestamp from socket-client is in seconds (not milliseconds), so multiply by 1000
      const receivedTimestamp = timestamp ? new Date(timestamp * 1000) : new Date();

      // Route to appropriate processor
      const processorMap: Record<
        string,
        (data: any[], timestamp: Date) => Promise<void>
      > = {
        NAMED_POWERBALL: (d) => this.processNamedPowerball(d),
        NAMED_POWERBALL3: (d) => this.processNamedPowerball3(d),
        NAMED_POWERBALL5: (d) => this.processNamedPowerball5(d),
        NAMED_POWERLADDER: (d) => this.processNamedPowerladder(d),
        NAMED_POWERLADDER3: (d) => this.processNamedPowerladder3(d),
        NAMED_POWERLADDER5: (d) => this.processNamedPowerladder5(d),
        NAMED_RBALL_56: (d) => this.processNamedRball56(d),
        NAMED_RUNNINGBALL5_4: (d, ts) => this.processNamedRunningball54(d, ts),
        NAMED_RUNNINGBALL3: (d, ts) => this.processNamedRunningball3(d, ts),
        NAMED_SPACE8: (d, ts) => this.processNamedSpace8(d, ts),
        NAMED_HOLDEM: (d) => this.processNamedHoldem(d),
      };

      const processor = processorMap[provider];
      if (processor) {
        await processor(roundsData, receivedTimestamp);
      } else {
        this.logger.warn(`Unknown provider: ${provider}`, null, 'MinigameProcessor');
      }

      return { success: true, provider };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Error processing minigame data: ${errorMessage}`,
        { stack: errorStack },
        'MinigameProcessor',
      );
      throw error;
    }
  }

  /**
   * Generic powerball processor
   */
  private async processPowerball(
    data: any[],
    gameKey: 'NAMED_POWERBALL' | 'NAMED_POWERBALL3' | 'NAMED_POWERBALL5' | 'NAMED_HOLDEM',
    gameName: string,
    parseRoundNumber: (item: any) => number,
    createCurrentRoundFn: (
      status: ReturnType<typeof getGameRoundStatus>,
      roundId: string,
      roundNumber: number,
    ) => Promise<void>,
    ensureNextRoundFn: (status: ReturnType<typeof getGameRoundStatus>) => Promise<void>,
    processBatchFn: (
      roundsData: RoundData[],
      currentRoundNumber: number,
    ) => Promise<void>,
  ): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    const currentRoundStatus = getGameRoundStatus(gameKey);
    const currentRoundNumber = currentRoundStatus.roundNumber;
    const currentRoundId = getRoundId(currentRoundStatus, gameKey);
    const now = new Date();

    // Only create current round if it has already started (startDatetime <= now)
    // This matches the logic in ensureNextRoundPowerball
    const currentRoundExists = await this.minigameRoundService.findByRoundId(
      currentRoundId,
      gameName,
    );

    if (!currentRoundExists && new Date(currentRoundStatus.roundStart) <= now) {
      await createCurrentRoundFn(currentRoundStatus, currentRoundId, currentRoundNumber);
    }

    const roundsPerDay = GAME_CONFIGS[gameKey].roundsPerDay;
    // Use filterRoundsForProcessing to:
    // - Include max 10 previous rounds from current day (< currentRoundNumber)
    // - Include all previous day rounds (> currentRoundNumber && <= roundsPerDay)
    const roundsData = filterRoundsForProcessing(
      data,
      currentRoundNumber,
      roundsPerDay,
      parseRoundNumber,
    );

    if (roundsData.length === 0) {
      this.logger.warn(
        `No rounds data found for ${gameKey}`,
        {
          currentRoundNumber,
          availableRounds: data.map((item) => parseRoundNumber(item)),
          roundsPerDay,
        },
        'MinigameSocketDataProcessor',
      );
      return;
    }

    // Separate rounds for logging
    const currentDayPreviousRounds = roundsData.filter((item) => {
      const roundNum = parseRoundNumber(item);
      return roundNum < currentRoundNumber;
    });
    const previousDayRounds = roundsData.filter((item) => {
      const roundNum = parseRoundNumber(item);
      return roundNum > currentRoundNumber && roundNum <= roundsPerDay;
    });

    // DEBUG: this.logger.info(`Processing ${gameKey} rounds`, {
    //   currentRoundNumber,
    //   currentDayPreviousRoundsCount: currentDayPreviousRounds.length,
    //   currentDayPreviousRounds: currentDayPreviousRounds.map((item) => parseRoundNumber(item)),
    //   previousDayRoundsCount: previousDayRounds.length,
    //   previousDayRounds: previousDayRounds.map((item) => parseRoundNumber(item)),
    //   totalRoundsCount: roundsData.length,
    // }, 'MinigameSocketDataProcessor');

    await ensureNextRoundFn(currentRoundStatus);
    await processBatchFn(roundsData, currentRoundNumber);
  }

  /**
   * Process NAMED_POWERBALL data
   */
  private async processNamedPowerball(data: any[]): Promise<void> {
    await this.processPowerball(
      data,
      'NAMED_POWERBALL',
      'named_powerball',
      (item) => parseInt(item.date_round) % 1000,
      (status, roundId, roundNumber) =>
        this.createCurrentRound(status, roundId, roundNumber),
      (status) => this.ensureNextRound(status),
      (roundsData, currentRoundNumber) =>
        this.processPreviousRoundsBatch(roundsData, currentRoundNumber),
    );
  }

  /**
   * Process multiple previous rounds in batch
   * Calculate correct timestamps and prepare data for batch upsert
   */
  private async processPreviousRoundsBatch(
    roundsData: RoundData[],
    currentRoundNumber: number,
  ): Promise<void> {
    await this.processPowerballBatch(
      roundsData,
      currentRoundNumber,
      'NAMED_POWERBALL',
      this.powerballRoundService,
      () => this.triggerBettingResultProcessing(),
    );
  }

  /**
   * Generic powerball batch processor
   */
  private async processPowerballBatch(
    roundsData: RoundData[],
    currentRoundNumber: number,
    gameKey: 'NAMED_POWERBALL' | 'NAMED_POWERBALL3' | 'NAMED_POWERBALL5',
    service: PowerballRoundService | Powerball3RoundService | Powerball5RoundService,
    triggerBettingResult: () => Promise<void>,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const currentRoundStatus = getGameRoundStatus(gameKey);
    const config = GAME_CONFIGS[gameKey];
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const roundsPerDay = config.roundsPerDay;

    const parseRoundNumber = (roundData: RoundData) => {
      if (
        gameKey === 'NAMED_POWERBALL' ||
        gameKey === 'NAMED_POWERBALL3' ||
        gameKey === 'NAMED_POWERBALL5'
      ) {
        return parseInt(roundData.date_round) % 1000;
      }
      return parseInt(roundData.date_round);
    };

    const batchData = createPowerballBatchData(
      roundsData,
      currentRoundNumber,
      currentRoundStatus,
      {
        gameKey,
        intervalMs,
        roundsPerDay,
        parseRoundNumber,
        getRoundStatus: getGameRoundStatus,
        getRoundId,
      },
    );

    try {
      await service.upsertRoundsBatch(batchData);
    } catch (error: any) {
      this.logger.error(
        `Database upsert failed for ${gameKey}`,
        {
          error: error?.message || 'Unknown error',
          roundsCount: batchData.length,
        },
        'MinigameSocketDataProcessor',
      );
      throw error;
    }

    await triggerBettingResult();
  }

  /**
   * Trigger betting result processing job
   */
  private async triggerBettingResultProcessing(): Promise<void> {
    try {
      await this.queueService.addBettingResultJob({
        game: 'named_powerball',
        roundDay: 'scan_all',
      });
    } catch (error) {
      this.logger.error(
        'Failed to trigger betting result processing',
        {
          error: error.message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Generic create current round for powerball games
   */
  private async createCurrentRoundPowerball(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
    gameName: string,
    publishPreviousRoundResultFn: (roundNumber: number) => Promise<void>,
  ): Promise<void> {
    await this.minigameRoundService.createRound({
      round_day: currentRoundId,
      round_number: currentRoundNumber,
      game_name: gameName,
      start_time: new Date(currentRoundStatus.roundStart),
      end_time: new Date(currentRoundStatus.roundEnd),
      status: currentRoundStatus.status,
    });

    try {
      const gameConfig = await this.gameConfigService.getGameConfigByKey(gameName);
      const gcValue = gameConfig ? JSON.parse(gameConfig.gcValue) : {};
      const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 5000;
      const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
      const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
      const blockingTime = gcValue.gcTimeBet || 20;

      const { getNamedPowerballBettingOptions } = await import(
        '../../../domains/game/constants/betting-options.const'
      );
      const betData = getNamedPowerballBettingOptions(gcValue);

      const gameOptionsData = {
        round_day: currentRoundId,
        start_time: Math.floor(new Date(currentRoundStatus.roundStart).getTime() / 1000),
        end_time: Math.floor(new Date(currentRoundStatus.roundEnd).getTime() / 1000),
        now: Math.floor(Date.now() / 1000),
        blocking_time: blockingTime,
        max_bet_payout: maxBetPayout,
        min_bet_amount: minBetAmount,
        max_bet_amount: maxBetAmount,
        bet_data: betData,
      };

      await this.redisService.publishEvent('minigame:round:new', {
        game: gameName,
        round_day: currentRoundId,
        round_number: currentRoundNumber,
        start_time: currentRoundStatus.roundStart,
        end_time: currentRoundStatus.roundEnd,
        game_options: gameOptionsData,
        timestamp: new Date().toISOString(),
      });

      // Wait and retry until data is available in database
      setTimeout(async () => {
        await this.publishPreviousRoundResultWithRetry(
          publishPreviousRoundResultFn,
          currentRoundNumber,
          gameName,
        );
      }, 8000);
    } catch (error) {
      this.logger.warn(
        'Failed to publish new round event',
        { error: (error as Error).message },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Create current round if not exists for NAMED_POWERBALL
   */
  private async createCurrentRound(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.createCurrentRoundPowerball(
      currentRoundStatus,
      currentRoundId,
      currentRoundNumber,
      'named_powerball',
      (roundNumber) => this.publishPreviousRoundResult(roundNumber),
    );
  }

  /**
   * Generic ensure next round for powerball games
   */
  private async ensureNextRoundPowerball(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    gameKey: 'NAMED_POWERBALL' | 'NAMED_POWERBALL3' | 'NAMED_POWERBALL5' | 'NAMED_HOLDEM',
    ensureRoundExistsFn: (
      roundId: string,
      roundNumber: number,
      roundStatus: ReturnType<typeof getGameRoundStatus>,
    ) => Promise<void>,
  ): Promise<void> {
    const nextRoundTime = new Date(
      new Date(currentRoundStatus.roundEnd).getTime() + 1000,
    );
    const nextRoundStatus = getGameRoundStatus(gameKey, nextRoundTime);
    const now = new Date();
    const nextRoundStart = new Date(nextRoundStatus.roundStart);

    if (nextRoundStart <= now) {
      const nextRoundId = getRoundId(nextRoundStatus, gameKey);
      const nextRoundNumber = nextRoundStatus.roundNumber;
      await ensureRoundExistsFn(nextRoundId, nextRoundNumber, nextRoundStatus);
    }
  }

  /**
   * Ensure next round exists in minigame_round for NAMED_POWERBALL
   */
  private async ensureNextRound(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureNextRoundPowerball(
      currentRoundStatus,
      'NAMED_POWERBALL',
      (roundId, roundNumber, roundStatus) =>
        this.ensureRoundExists(roundId, roundNumber, roundStatus),
    );
  }

  /**
   * Generic ensure round exists for powerball games
   */
  private async ensureRoundExistsPowerball(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
    gameName: string,
    publishPreviousRoundResultFn: (roundNumber: number) => Promise<void>,
  ): Promise<void> {
    const existingRound = await this.minigameRoundService.findByRoundId(
      roundId,
      gameName,
    );

    if (!existingRound) {
      await this.minigameRoundService.createRound({
        round_day: roundId,
        round_number: roundNumber,
        game_name: gameName,
        start_time: new Date(roundStatus.roundStart),
        end_time: new Date(roundStatus.roundEnd),
        status: roundStatus.status,
      });

      try {
        const gameConfig = await this.gameConfigService.getGameConfigByKey(gameName);
        if (!gameConfig) {
          this.logger.warn(
            `Game config not found for ${gameName}, skipping round:new event`,
            {},
            'MinigameSocketDataProcessor',
          );
          return;
        }

        const gcValue = JSON.parse(gameConfig.gcValue);
        const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 5000;
        const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
        const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
        const blockingTime = gcValue.gcTimeBet || 20;

        // Get betting options for powerball games
        const { getNamedPowerballBettingOptions } = await import(
          '../../../domains/game/constants/betting-options.const'
        );
        const betData = getNamedPowerballBettingOptions(gcValue);

        const eventData: any = {
          game: gameName,
          round_day: roundId,
          round_number: roundNumber,
          start_time: roundStatus.roundStart,
          end_time: roundStatus.roundEnd,
          timestamp: new Date().toISOString(),
          game_options: {
            round_day: roundId,
            start_time: Math.floor(new Date(roundStatus.roundStart).getTime() / 1000),
            end_time: Math.floor(new Date(roundStatus.roundEnd).getTime() / 1000),
            now: Math.floor(Date.now() / 1000),
            blocking_time: blockingTime,
            max_bet_payout: maxBetPayout,
            min_bet_amount: minBetAmount,
            max_bet_amount: maxBetAmount,
            bet_data: betData,
          },
        };

        await this.redisService.publishEvent('minigame:round:new', eventData);

        // Delay 8 seconds for non-runningball games, then retry until data is available
        setTimeout(async () => {
          await this.publishPreviousRoundResultWithRetry(
            publishPreviousRoundResultFn,
            roundNumber,
            gameName,
          );
        }, 8000);
      } catch (error) {
        this.logger.warn(
          'Failed to publish new round event',
          { error: (error as Error).message },
          'MinigameSocketDataProcessor',
        );
      }
    }
  }

  /**
   * Ensure a round exists in minigame_round for NAMED_POWERBALL
   */
  private async ensureRoundExists(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureRoundExistsPowerball(
      roundId,
      roundNumber,
      roundStatus,
      'named_powerball',
      (roundNumber) => this.publishPreviousRoundResult(roundNumber),
    );
  }

  /**
   * Publish the result of the previous round when new round is created
   * Simplified logic - just send previous round result when available
   */
  /**
   * Generic publish previous round result for powerball games
   */
  private async publishPreviousRoundResultPowerball(
    currentRoundNumber: number,
    gameName: string,
    service: PowerballRoundService | Powerball3RoundService | Powerball5RoundService,
    roundsPerDay: number,
  ): Promise<void> {
    let previousRoundNumber = currentRoundNumber - 1;
    if (previousRoundNumber < 1) {
      previousRoundNumber = roundsPerDay;
    }

    const now = new Date();
    const tzOffset = parseInt(
      process.env.TZ_OFFSET_FOR_ROUND?.replace('+', '') || '9',
      10,
    );
    const utcWithOffset = new Date(now.getTime() + tzOffset * 60 * 60 * 1000);
    const currentDate = utcWithOffset.toISOString().split('T')[0];

    const previousRoundResult = await service.getRoundByIdentifier(
      currentDate.replaceAll('-', '') +
        '_' +
        previousRoundNumber.toString().padStart(3, '0'),
    );

    if (!previousRoundResult) {
      throw new Error(
        `Previous round result not found for round: ${previousRoundNumber}`,
      );
    }

    const hasValidResults =
      previousRoundResult.balldata1 &&
      previousRoundResult.balldata1 !== 'd' &&
      previousRoundResult.balldata2 &&
      previousRoundResult.balldata2 !== 'd' &&
      previousRoundResult.balldata3 &&
      previousRoundResult.balldata3 !== 'd' &&
      previousRoundResult.balldata4 &&
      previousRoundResult.balldata4 !== 'd' &&
      previousRoundResult.balldata5 &&
      previousRoundResult.balldata5 !== 'd' &&
      previousRoundResult.balldata6 &&
      previousRoundResult.balldata6 !== 'p';

    if (!hasValidResults) {
      throw new Error(
        `Previous round result has invalid data for ${gameName}: round ${previousRoundNumber}`,
      );
    }

    const balls = [
      previousRoundResult.balldata1.replace('d', ''),
      previousRoundResult.balldata2.replace('d', ''),
      previousRoundResult.balldata3.replace('d', ''),
      previousRoundResult.balldata4.replace('d', ''),
      previousRoundResult.balldata5.replace('d', ''),
    ];
    const powerball = previousRoundResult.balldata6.replace('p', '');

    await this.redisService.publishEvent('minigame:round:result', {
      game: gameName,
      round_day: previousRoundResult.round,
      round_number: previousRoundNumber,
      balls: balls,
      powerball: powerball,
      result_data: {
        powerball_odd_even: previousRoundResult.data1,
        powerball_under_over: previousRoundResult.data2,
        sum_odd_even: previousRoundResult.data3,
        sum_under_over: previousRoundResult.data4,
        sum_size: previousRoundResult.data5,
      },
      created_at: previousRoundResult.regDate,
    });
  }

  /**
   * Publish previous round result for NAMED_POWERBALL
   */
  private async publishPreviousRoundResult(currentRoundNumber: number): Promise<void> {
    await this.publishPreviousRoundResultPowerball(
      currentRoundNumber,
      'named_powerball',
      this.powerballRoundService,
      GAME_CONFIGS.NAMED_POWERBALL.roundsPerDay,
    );
  }

  /**
   * Process NAMED_POWERBALL3 data
   */
  private async processNamedPowerball3(data: any[]): Promise<void> {
    await this.processPowerball(
      data,
      'NAMED_POWERBALL3',
      'named_powerball3',
      (item) => parseInt(item.date_round) % 1000,
      (status, roundId, roundNumber) =>
        this.createCurrentRound3(status, roundId, roundNumber),
      (status) => this.ensureNextRound3(status),
      (roundsData, currentRoundNumber) =>
        this.processPreviousRoundsBatch3(roundsData, currentRoundNumber),
    );
  }

  /**
   * Process NAMED_POWERBALL5 data
   */
  private async processNamedPowerball5(data: any[]): Promise<void> {
    await this.processPowerball(
      data,
      'NAMED_POWERBALL5',
      'named_powerball5',
      (item) => parseInt(item.date_round) % 1000,
      (status, roundId, roundNumber) =>
        this.createCurrentRound5(status, roundId, roundNumber),
      (status) => this.ensureNextRound5(status),
      (roundsData, currentRoundNumber) =>
        this.processPreviousRoundsBatch5(roundsData, currentRoundNumber),
    );
  }

  /**
   * Process multiple previous rounds in batch for NAMED_POWERBALL3
   */
  private async processPreviousRoundsBatch3(
    roundsData: RoundData[],
    currentRoundNumber: number,
  ): Promise<void> {
    await this.processPowerballBatch(
      roundsData,
      currentRoundNumber,
      'NAMED_POWERBALL3',
      this.powerball3RoundService,
      () => this.triggerBettingResultProcessing3(),
    );
  }

  /**
   * Process multiple previous rounds in batch for NAMED_POWERBALL5
   */
  private async processPreviousRoundsBatch5(
    roundsData: RoundData[],
    currentRoundNumber: number,
  ): Promise<void> {
    await this.processPowerballBatch(
      roundsData,
      currentRoundNumber,
      'NAMED_POWERBALL5',
      this.powerball5RoundService,
      () => this.triggerBettingResultProcessing5(),
    );
  }

  /**
   * Trigger betting result processing job for NAMED_POWERBALL3
   */
  private async triggerBettingResultProcessing3(): Promise<void> {
    try {
      await this.queueService.addBettingResultJob({
        game: 'named_powerball3',
        roundDay: 'scan_all',
      });
    } catch (error) {
      this.logger.error(
        'Failed to trigger betting result processing for NAMED_POWERBALL3',
        {
          error: error.message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Trigger betting result processing job for NAMED_POWERBALL5
   */
  private async triggerBettingResultProcessing5(): Promise<void> {
    try {
      await this.queueService.addBettingResultJob({
        game: 'named_powerball5',
        roundDay: 'scan_all',
      });
    } catch (error) {
      this.logger.error(
        'Failed to trigger betting result processing for NAMED_POWERBALL5',
        {
          error: error.message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Create current round if not exists for NAMED_POWERBALL3
   */
  private async createCurrentRound3(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.createCurrentRoundPowerball(
      currentRoundStatus,
      currentRoundId,
      currentRoundNumber,
      'named_powerball3',
      (roundNumber) => this.publishPreviousRoundResult3(roundNumber),
    );
  }

  /**
   * Create current round if not exists for NAMED_POWERBALL5
   */
  private async createCurrentRound5(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.createCurrentRoundPowerball(
      currentRoundStatus,
      currentRoundId,
      currentRoundNumber,
      'named_powerball5',
      (roundNumber) => this.publishPreviousRoundResult5(roundNumber),
    );
  }

  /**
   * Ensure next round exists in minigame_round for NAMED_POWERBALL3
   */
  private async ensureNextRound3(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureNextRoundPowerball(
      currentRoundStatus,
      'NAMED_POWERBALL3',
      (roundId, roundNumber, roundStatus) =>
        this.ensureRoundExists3(roundId, roundNumber, roundStatus),
    );
  }

  /**
   * Ensure next round exists in minigame_round for NAMED_POWERBALL5
   */
  private async ensureNextRound5(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureNextRoundPowerball(
      currentRoundStatus,
      'NAMED_POWERBALL5',
      (roundId, roundNumber, roundStatus) =>
        this.ensureRoundExists5(roundId, roundNumber, roundStatus),
    );
  }

  /**
   * Ensure round exists in database for NAMED_POWERBALL3
   */
  private async ensureRoundExists3(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureRoundExistsPowerball(
      roundId,
      roundNumber,
      roundStatus,
      'named_powerball3',
      (roundNumber) => this.publishPreviousRoundResult3(roundNumber),
    );
  }

  /**
   * Ensure round exists in database for NAMED_POWERBALL5
   */
  private async ensureRoundExists5(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureRoundExistsPowerball(
      roundId,
      roundNumber,
      roundStatus,
      'named_powerball5',
      (roundNumber) => this.publishPreviousRoundResult5(roundNumber),
    );
  }

  /**
   * Publish previous round result for NAMED_POWERBALL3
   */
  private async publishPreviousRoundResult3(currentRoundNumber: number): Promise<void> {
    await this.publishPreviousRoundResultPowerball(
      currentRoundNumber,
      'named_powerball3',
      this.powerball3RoundService,
      GAME_CONFIGS.NAMED_POWERBALL3.roundsPerDay,
    );
  }

  /**
   * Publish previous round result for NAMED_POWERBALL5
   */
  private async publishPreviousRoundResult5(currentRoundNumber: number): Promise<void> {
    await this.publishPreviousRoundResultPowerball(
      currentRoundNumber,
      'named_powerball5',
      this.powerball5RoundService,
      GAME_CONFIGS.NAMED_POWERBALL5.roundsPerDay,
    );
  }

  /**
   * Process NAMED_POWERLADDER data
   * - Check current round based on time (5-minute intervals starting at 23:57)
   * - Ensure current round exists in database
   * - Process and save rounds with results
   * - Send realtime for latest round only
   */
  private async processNamedPowerladder(data: any[]): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Get current round status based on current time (5-minute intervals)
    const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER');
    const currentRoundNumber = currentRoundStatus.roundNumber;
    const currentRoundId = getRoundId(currentRoundStatus, 'NAMED_POWERLADDER');
    const now = new Date();

    // Only create current round if it has already started (startDatetime <= now)
    const currentRoundExists = await this.minigameRoundService.findByRoundId(
      currentRoundId,
      'named_powerladder',
    );

    if (!currentRoundExists && new Date(currentRoundStatus.roundStart) <= now) {
      // Create current round if not exists and has started
      await this.createCurrentRoundPowerladder(
        currentRoundStatus,
        currentRoundId,
        currentRoundNumber,
      );
    }

    // Filter previous rounds using smart filtering logic
    const roundsPerDay = GAME_CONFIGS.NAMED_POWERLADDER.roundsPerDay;
    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;

    // Use filterRoundsForProcessing to:
    // - Include max 10 previous rounds from current day (< currentRoundNumber)
    // - Include all previous day rounds (> currentRoundNumber && <= roundsPerDay)
    const previousRoundsData = filterRoundsForProcessing(
      data,
      currentRoundNumber,
      roundsPerDay,
      parseRoundNumber,
    );

    if (previousRoundsData.length === 0) {
      this.logger.warn(
        'No previous rounds data found for NAMED_POWERLADDER',
        {
          currentRoundNumber,
          availableRounds: data.map((item) => parseRoundNumber(item)),
        },
        'MinigameSocketDataProcessor',
      );
      return;
    }

    // Ensure next round exists
    await this.ensureNextRoundPowerladder(currentRoundStatus);

    // Process all previous rounds data
    await this.processPreviousRoundsBatchPowerladder(
      previousRoundsData,
      currentRoundNumber,
    );
  }

  /**
   * Process multiple previous rounds in batch for NAMED_POWERLADDER
   * Calculate correct timestamps and prepare data for batch upsert
   */
  private async processPreviousRoundsBatchPowerladder(
    roundsData: any[],
    currentRoundNumber: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER');
    const config = GAME_CONFIGS.NAMED_POWERLADDER;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const roundsPerDay = config.roundsPerDay;

    const batchData = roundsData.map((roundData) => {
      const roundNumber = parseInt(roundData.date_round) % 1000;

      // Use calculateRoundStatus directly to get correct baseDatetime
      // This ensures baseDatetime is calculated correctly for rounds starting early (23:57)
      const roundStatus = calculateRoundStatus(
        'NAMED_POWERLADDER',
        roundNumber,
        currentRoundNumber,
        currentRoundStatus,
        intervalMs,
        roundsPerDay,
      );
      const roundId = getRoundId(roundStatus, 'NAMED_POWERLADDER');

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_POWERLADDER',
        line_count: roundData.line_count,
        odd_even: roundData.odd_even,
        start_point: roundData.start_position || roundData.start_point, // Socket data uses start_position
        result_time: new Date(roundStatus.roundEnd),
      };
    });

    // Batch upsert all rounds at once
    try {
      await this.powerladderRoundService.upsertRoundsBatch(batchData);
    } catch (error: any) {
      this.logger.error(
        'Database upsert failed for NAMED_POWERLADDER',
        {
          error: error?.message || 'Unknown error',
          roundsCount: batchData.length,
        },
        'MinigameSocketDataProcessor',
      );
      throw error;
    }

    // Trigger betting result processing to scan all pending bets
    await this.triggerBettingResultProcessingPowerladder();
  }

  /**
   * Trigger betting result processing job for NAMED_POWERLADDER
   */
  private async triggerBettingResultProcessingPowerladder(): Promise<void> {
    try {
      await this.queueService.addBettingResultJob({
        game: 'named_powerladder',
        roundDay: 'scan_all',
      });
    } catch (error) {
      this.logger.error(
        'Failed to trigger betting result processing for NAMED_POWERLADDER',
        {
          error: error.message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Create current round if not exists for NAMED_POWERLADDER
   */
  private async createCurrentRoundPowerladder(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.minigameRoundService.createRound({
      round_day: currentRoundId,
      round_number: currentRoundNumber,
      game_name: 'named_powerladder',
      start_time: new Date(currentRoundStatus.roundStart),
      end_time: new Date(currentRoundStatus.roundEnd),
      status: 'active',
    });

    // Publish new round event
    try {
      const gameConfig =
        await this.gameConfigService.getGameConfigByKey('named_powerladder');

      if (!gameConfig) {
        throw new Error('Game config not found for named_powerladder');
      }

      const gcValue = JSON.parse(gameConfig.gcValue);
      const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 5000;
      const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
      const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
      const blockingTime = gcValue.gcTimeBet || 20;

      const { getNamedPowerladderBettingOptions } = await import(
        '../../../domains/game/constants/betting-options.const'
      );
      const betData = getNamedPowerladderBettingOptions(gcValue);

      const gameOptionsData = {
        round_day: currentRoundId,
        start_time: Math.floor(new Date(currentRoundStatus.roundStart).getTime() / 1000),
        end_time: Math.floor(new Date(currentRoundStatus.roundEnd).getTime() / 1000),
        now: Math.floor(Date.now() / 1000),
        blocking_time: blockingTime,
        max_bet_payout: maxBetPayout,
        min_bet_amount: minBetAmount,
        max_bet_amount: maxBetAmount,
        bet_data: betData,
      };

      await this.redisService.publishEvent('minigame:round:new', {
        game: 'named_powerladder',
        round: currentRoundId,
        round_number: currentRoundNumber,
        start_time: currentRoundStatus.roundStart,
        end_time: currentRoundStatus.roundEnd,
        game_options: gameOptionsData,
        timestamp: new Date().toISOString(),
      });

      // Send previous round result when new round starts (with 8 second delay, then retry until data is available)
      setTimeout(async () => {
        await this.publishPreviousRoundResultWithRetry(
          (roundNumber) => this.publishPreviousRoundResultPowerladder(roundNumber),
          currentRoundNumber,
          'named_powerladder',
        );
      }, 8000); // 8 seconds delay
    } catch (error) {
      this.logger.warn(
        'Failed to publish new round event for NAMED_POWERLADDER',
        { error: (error as Error).message },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Create round for ladder games (generic helper)
   */
  private async createRoundPowerladder(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
    gameName: string,
  ): Promise<void> {
    await this.minigameRoundService.createRound({
      round_day: roundId,
      round_number: roundNumber,
      game_name: gameName,
      start_time: new Date(roundStatus.roundStart),
      end_time: new Date(roundStatus.roundEnd),
      status: 'active',
    });
  }

  /**
   * Ensure next round exists in minigame_round for NAMED_POWERLADDER
   * Only create if next round has already started (start_datetime <= now)
   */
  private async ensureNextRoundPowerladder(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    const nextRoundTime = new Date(
      new Date(currentRoundStatus.roundEnd).getTime() + 1000,
    );

    const nextRoundStatus = getGameRoundStatus('NAMED_POWERLADDER', nextRoundTime);

    // Only create next round if it has already started
    const now = new Date();
    const nextRoundStart = new Date(nextRoundStatus.roundStart);

    if (nextRoundStart <= now) {
      const nextRoundId = getRoundId(nextRoundStatus, 'NAMED_POWERLADDER');
      const nextRoundNumber = nextRoundStatus.roundNumber;
      await this.ensureRoundExistsPowerladder(
        nextRoundId,
        nextRoundNumber,
        nextRoundStatus,
      );
    }
  }

  /**
   * Ensure round exists in database for NAMED_POWERLADDER
   */
  private async ensureRoundExistsPowerladder(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    const existingRound = await this.minigameRoundService.findByRoundId(
      roundId,
      'named_powerladder',
    );

    if (!existingRound) {
      await this.minigameRoundService.createRound({
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_POWERLADDER',
        start_time: new Date(roundStatus.roundStart),
        end_time: new Date(roundStatus.roundEnd),
        status: 'active',
      });

      // Publish new round event
      try {
        const gameConfig =
          await this.gameConfigService.getGameConfigByKey('named_powerladder');
        if (gameConfig) {
          const gcValue = JSON.parse(gameConfig.gcValue);
          const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 5000;
          const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
          const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
          const blockingTime = gcValue.gcTimeBet || 20;

          const { getNamedPowerladderBettingOptions } = await import(
            '../../../domains/game/constants/betting-options.const'
          );
          const betData = getNamedPowerladderBettingOptions(gcValue);

          const gameOptionsData = {
            round_day: roundId,
            start_time: Math.floor(new Date(roundStatus.roundStart).getTime() / 1000),
            end_time: Math.floor(new Date(roundStatus.roundEnd).getTime() / 1000),
            now: Math.floor(Date.now() / 1000),
            blocking_time: blockingTime,
            max_bet_payout: maxBetPayout,
            min_bet_amount: minBetAmount,
            max_bet_amount: maxBetAmount,
            bet_data: betData,
          };

          await this.redisService.publishEvent('minigame:round:new', {
            game: 'named_powerladder',
            round: roundId,
            round_number: roundNumber,
            start_time: roundStatus.roundStart,
            end_time: roundStatus.roundEnd,
            game_options: gameOptionsData,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        this.logger.warn(
          'Failed to publish new round event for NAMED_POWERLADDER',
          { error: (error as Error).message },
          'MinigameSocketDataProcessor',
        );
      }
    }
  }

  /**
   * Publish previous round result for NAMED_POWERLADDER
   * Uses getRoundStatusForRoundNumber and getRoundId to correctly calculate round ID
   * This handles the case where round 1 starts early (23:57) on the previous day
   */
  private async publishPreviousRoundResultPowerladder(
    currentRoundNumber: number,
  ): Promise<void> {
    try {
      let previousRoundNumber = currentRoundNumber - 1;
      if (previousRoundNumber < 1) {
        previousRoundNumber = GAME_CONFIGS.NAMED_POWERLADDER.roundsPerDay;
      }

      // Get current round status to use as reference for calculating previous round
      const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER');

      // Calculate previous round status with correct date handling
      const previousRoundStatus = getRoundStatusForRoundNumber(
        'NAMED_POWERLADDER',
        previousRoundNumber,
        new Date(currentRoundStatus.roundStart),
      );

      // Get correct round ID (handles round 1 starting early at 23:57)
      const previousRoundId = getRoundId(previousRoundStatus, 'NAMED_POWERLADDER');

      const previousRoundResult =
        await this.powerladderRoundService.getRoundByRoundDay(previousRoundId);

      if (previousRoundResult) {
        // Validate results
        const hasValidResults =
          previousRoundResult.data1 &&
          (previousRoundResult.data1 === 'res_odd' ||
            previousRoundResult.data1 === 'res_even') &&
          previousRoundResult.data2 &&
          (previousRoundResult.data2 === 'line3' ||
            previousRoundResult.data2 === 'line4') &&
          previousRoundResult.data3 &&
          (previousRoundResult.data3 === 'left' || previousRoundResult.data3 === 'right');

        if (!hasValidResults) {
          throw new Error(
            `Previous round result has invalid data for NAMED_POWERLADDER: round ${previousRoundNumber}`,
          );
        }

        // Map database values to bet keys (same logic as round-results.controller.ts)
        // data1: result odd/even (res_odd/res_even) -> odd/even
        // data2: line count (line3/line4)
        // data3: start point (left/right)
        const resultOddEven =
          previousRoundResult.data1 === 'res_odd'
            ? 'odd'
            : previousRoundResult.data1 === 'res_even'
              ? 'even'
              : previousRoundResult.data1;
        const lineCount = previousRoundResult.data2; // line3 or line4
        const startPoint = previousRoundResult.data3; // left or right

        // Calculate combination results - only one combination will be true
        const combinations = {
          left_3_even:
            startPoint === 'left' && lineCount === 'line3' && resultOddEven === 'even',
          right_3_odd:
            startPoint === 'right' && lineCount === 'line3' && resultOddEven === 'odd',
          left_4_odd:
            startPoint === 'left' && lineCount === 'line4' && resultOddEven === 'odd',
          right_4_even:
            startPoint === 'right' && lineCount === 'line4' && resultOddEven === 'even',
        };

        // Find the winning combination (only one should be true)
        const winningCombination =
          Object.keys(combinations).find((key) => combinations[key]) || null;

        await this.redisService.publishEvent('minigame:round:result', {
          game: 'named_powerladder',
          round_day: previousRoundId,
          round_number: previousRoundNumber,
          result_data: {
            line: lineCount, // line3 or line4
            start_point: startPoint, // left or right
            odd_even: resultOddEven, // odd or even
            // Combination results - only the winning one will be set
            // left_3_even: combinations.left_3_even,
            // right_3_odd: combinations.right_3_odd,
            // left_4_odd: combinations.left_4_odd,
            // right_4_even: combinations.right_4_even,
            // Winning combination for easy access
            winning_combination: winningCombination,
          },
          created_at: previousRoundResult.regDate,
        });
      } else {
        throw new Error(
          `Previous round result not found for NAMED_POWERLADDER: ${previousRoundId}`,
        );
      }
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }

  /**
   * Process NAMED_POWERLADDER3 data
   */
  private async processNamedPowerladder3(data: any[]): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Get current round status based on current time (3-minute intervals)
    const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER3');
    const currentRoundNumber = currentRoundStatus.roundNumber;
    const currentRoundId = getRoundId(currentRoundStatus, 'NAMED_POWERLADDER3');
    const now = new Date();

    // Only create current round if it has already started (startDatetime <= now)
    const currentRoundExists = await this.minigameRoundService.findByRoundId(
      currentRoundId,
      'named_powerladder3',
    );

    if (!currentRoundExists && new Date(currentRoundStatus.roundStart) <= now) {
      // Create current round if not exists and has started
      await this.createCurrentRoundPowerladder3(
        currentRoundStatus,
        currentRoundId,
        currentRoundNumber,
      );
    }

    // Filter previous rounds using smart filtering logic
    const roundsPerDay = GAME_CONFIGS.NAMED_POWERLADDER3.roundsPerDay;
    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;

    // Use filterRoundsForProcessing to:
    // - Include max 10 previous rounds from current day (< currentRoundNumber)
    // - Include all previous day rounds (> currentRoundNumber && <= roundsPerDay)
    const previousRoundsData = filterRoundsForProcessing(
      data,
      currentRoundNumber,
      roundsPerDay,
      parseRoundNumber,
    );

    if (previousRoundsData.length === 0) {
      this.logger.warn(
        'No previous rounds data found for NAMED_POWERLADDER3',
        {
          currentRoundNumber,
          availableRounds: data.map((item) => parseRoundNumber(item)),
        },
        'MinigameSocketDataProcessor',
      );
      return;
    }

    // Ensure next round exists
    await this.ensureNextRoundPowerladder3(currentRoundStatus);

    // Process all previous rounds data
    await this.processPreviousRoundsBatchPowerladder3(
      previousRoundsData,
      currentRoundNumber,
    );
  }

  /**
   * Process NAMED_POWERLADDER5 data
   */
  private async processNamedPowerladder5(data: any[]): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      return;
    }

    // Get current round status based on current time (5-minute intervals)
    const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER5');
    const currentRoundNumber = currentRoundStatus.roundNumber;
    const currentRoundId = getRoundId(currentRoundStatus, 'NAMED_POWERLADDER5');
    const now = new Date();

    // Only create current round if it has already started (startDatetime <= now)
    const currentRoundExists = await this.minigameRoundService.findByRoundId(
      currentRoundId,
      'named_powerladder5',
    );

    if (!currentRoundExists && new Date(currentRoundStatus.roundStart) <= now) {
      // Create current round if not exists and has started
      await this.createCurrentRoundPowerladder5(
        currentRoundStatus,
        currentRoundId,
        currentRoundNumber,
      );
    }

    // Filter previous rounds using smart filtering logic
    const roundsPerDay = GAME_CONFIGS.NAMED_POWERLADDER5.roundsPerDay;
    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;

    // Use filterRoundsForProcessing to:
    // - Include max 10 previous rounds from current day (< currentRoundNumber)
    // - Include all previous day rounds (> currentRoundNumber && <= roundsPerDay)
    const previousRoundsData = filterRoundsForProcessing(
      data,
      currentRoundNumber,
      roundsPerDay,
      parseRoundNumber,
    );

    if (previousRoundsData.length === 0) {
      this.logger.warn(
        'No previous rounds data found for NAMED_POWERLADDER5',
        {
          currentRoundNumber,
          availableRounds: data.map((item) => parseRoundNumber(item)),
        },
        'MinigameSocketDataProcessor',
      );
      return;
    }

    // Ensure next round exists
    await this.ensureNextRoundPowerladder5(currentRoundStatus);

    // Process all previous rounds data
    await this.processPreviousRoundsBatchPowerladder5(
      previousRoundsData,
      currentRoundNumber,
    );
  }

  /**
   * Process multiple previous rounds in batch for NAMED_POWERLADDER3
   */
  private async processPreviousRoundsBatchPowerladder3(
    roundsData: any[],
    currentRoundNumber: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER3');
    const config = GAME_CONFIGS.NAMED_POWERLADDER3;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const roundsPerDay = config.roundsPerDay;

    const batchData = roundsData.map((roundData) => {
      const roundNumber = parseInt(roundData.date_round) % 1000;

      // Use calculateRoundStatus directly to get correct baseDatetime
      const roundStatus = calculateRoundStatus(
        'NAMED_POWERLADDER3',
        roundNumber,
        currentRoundNumber,
        currentRoundStatus,
        intervalMs,
        roundsPerDay,
      );
      const roundId = getRoundId(roundStatus, 'NAMED_POWERLADDER3');

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_POWERLADDER3',
        line_count: roundData.line_count,
        odd_even: roundData.odd_even,
        start_point: roundData.start_position || roundData.start_point, // Socket data uses start_position
        result_time: new Date(roundStatus.roundEnd),
      };
    });

    // Batch upsert all rounds at once
    try {
      await this.powerladder3RoundService.upsertRoundsBatch(batchData);
    } catch (error: any) {
      this.logger.error(
        'Database upsert failed for NAMED_POWERLADDER3',
        {
          error: error?.message || 'Unknown error',
          roundsCount: batchData.length,
        },
        'MinigameSocketDataProcessor',
      );
      throw error;
    }

    // Trigger betting result processing
    await this.triggerBettingResultProcessingPowerladder3();
  }

  /**
   * Process multiple previous rounds in batch for NAMED_POWERLADDER5
   */
  private async processPreviousRoundsBatchPowerladder5(
    roundsData: any[],
    currentRoundNumber: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER5');
    const config = GAME_CONFIGS.NAMED_POWERLADDER5;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const roundsPerDay = config.roundsPerDay;

    const batchData = roundsData.map((roundData) => {
      const roundNumber = parseInt(roundData.date_round) % 1000;

      // Use calculateRoundStatus directly to get correct baseDatetime
      const roundStatus = calculateRoundStatus(
        'NAMED_POWERLADDER5',
        roundNumber,
        currentRoundNumber,
        currentRoundStatus,
        intervalMs,
        roundsPerDay,
      );
      const roundId = getRoundId(roundStatus, 'NAMED_POWERLADDER5');

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_POWERLADDER5',
        line_count: roundData.line_count,
        odd_even: roundData.odd_even,
        start_point: roundData.start_position || roundData.start_point, // Socket data uses start_position
        result_time: new Date(roundStatus.roundEnd),
      };
    });

    // Batch upsert all rounds at once
    try {
      await this.powerladder5RoundService.upsertRoundsBatch(batchData);
    } catch (error: any) {
      this.logger.error(
        'Database upsert failed for NAMED_POWERLADDER5',
        {
          error: error?.message || 'Unknown error',
          roundsCount: batchData.length,
        },
        'MinigameSocketDataProcessor',
      );
      throw error;
    }

    // Trigger betting result processing
    await this.triggerBettingResultProcessingPowerladder5();
  }

  /**
   * Create current round for NAMED_POWERLADDER3
   */
  private async createCurrentRoundPowerladder3(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.createRoundPowerladder(
      currentRoundId,
      currentRoundNumber,
      currentRoundStatus,
      'named_powerladder3',
    );

    // Publish new round event
    try {
      const gameConfig =
        await this.gameConfigService.getGameConfigByKey('named_powerladder3');

      if (!gameConfig) {
        throw new Error('Game config not found for named_powerladder3');
      }

      const gcValue = JSON.parse(gameConfig.gcValue);
      const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 5000;
      const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
      const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
      const blockingTime = gcValue.gcTimeBet || 20;

      const { getNamedPowerladderBettingOptions } = await import(
        '../../../domains/game/constants/betting-options.const'
      );
      const betData = getNamedPowerladderBettingOptions(gcValue);

      const gameOptionsData = {
        round_day: currentRoundId,
        start_time: Math.floor(new Date(currentRoundStatus.roundStart).getTime() / 1000),
        end_time: Math.floor(new Date(currentRoundStatus.roundEnd).getTime() / 1000),
        now: Math.floor(Date.now() / 1000),
        blocking_time: blockingTime,
        max_bet_payout: maxBetPayout,
        min_bet_amount: minBetAmount,
        max_bet_amount: maxBetAmount,
        bet_data: betData,
      };

      await this.redisService.publishEvent('minigame:round:new', {
        game: 'named_powerladder3',
        round: currentRoundId,
        round_number: currentRoundNumber,
        start_time: currentRoundStatus.roundStart,
        end_time: currentRoundStatus.roundEnd,
        game_options: gameOptionsData,
        timestamp: new Date().toISOString(),
      });

      setTimeout(async () => {
        await this.publishPreviousRoundResultWithRetry(
          (roundNumber) => this.publishPreviousRoundResultPowerladder3(roundNumber),
          currentRoundNumber,
          'named_powerladder3',
        );
      }, 8000);
    } catch (error) {
      this.logger.warn(
        'Failed to publish new round event for NAMED_POWERLADDER3',
        { error: (error as Error).message },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Create current round for NAMED_POWERLADDER5
   */
  private async createCurrentRoundPowerladder5(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.createRoundPowerladder(
      currentRoundId,
      currentRoundNumber,
      currentRoundStatus,
      'named_powerladder5',
    );

    // Publish new round event
    try {
      const gameConfig =
        await this.gameConfigService.getGameConfigByKey('named_powerladder5');

      if (!gameConfig) {
        throw new Error('Game config not found for named_powerladder5');
      }

      const gcValue = JSON.parse(gameConfig.gcValue);
      const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 5000;
      const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
      const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
      const blockingTime = gcValue.gcTimeBet || 20;

      const { getNamedPowerladderBettingOptions } = await import(
        '../../../domains/game/constants/betting-options.const'
      );
      const betData = getNamedPowerladderBettingOptions(gcValue);

      const gameOptionsData = {
        round_day: currentRoundId,
        start_time: Math.floor(new Date(currentRoundStatus.roundStart).getTime() / 1000),
        end_time: Math.floor(new Date(currentRoundStatus.roundEnd).getTime() / 1000),
        now: Math.floor(Date.now() / 1000),
        blocking_time: blockingTime,
        max_bet_payout: maxBetPayout,
        min_bet_amount: minBetAmount,
        max_bet_amount: maxBetAmount,
        bet_data: betData,
      };

      await this.redisService.publishEvent('minigame:round:new', {
        game: 'named_powerladder5',
        round: currentRoundId,
        round_number: currentRoundNumber,
        start_time: currentRoundStatus.roundStart,
        end_time: currentRoundStatus.roundEnd,
        game_options: gameOptionsData,
        timestamp: new Date().toISOString(),
      });

      setTimeout(async () => {
        await this.publishPreviousRoundResultWithRetry(
          (roundNumber) => this.publishPreviousRoundResultPowerladder5(roundNumber),
          currentRoundNumber,
          'named_powerladder5',
        );
      }, 8000);
    } catch (error) {
      this.logger.warn(
        'Failed to publish new round event for NAMED_POWERLADDER5',
        { error: (error as Error).message },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Ensure next round exists for NAMED_POWERLADDER3
   * Only create if next round has already started (startDatetime <= now)
   */
  private async ensureNextRoundPowerladder3(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    const nextRoundTime = new Date(
      new Date(currentRoundStatus.roundEnd).getTime() + 1000,
    );
    const nextRoundStatus = getGameRoundStatus('NAMED_POWERLADDER3', nextRoundTime);
    const now = new Date();
    const nextRoundStart = new Date(nextRoundStatus.roundStart);

    // Only create next round if it has already started
    if (nextRoundStart <= now) {
      const nextRoundId = getRoundId(nextRoundStatus, 'NAMED_POWERLADDER3');
      const nextRoundNumber = nextRoundStatus.roundNumber;

      await this.createRoundPowerladder(
        nextRoundId,
        nextRoundNumber,
        nextRoundStatus,
        'named_powerladder3',
      );
    }
  }

  /**
   * Ensure next round exists for NAMED_POWERLADDER5
   * Only create if next round has already started (startDatetime <= now)
   */
  private async ensureNextRoundPowerladder5(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    const nextRoundTime = new Date(
      new Date(currentRoundStatus.roundEnd).getTime() + 1000,
    );
    const nextRoundStatus = getGameRoundStatus('NAMED_POWERLADDER5', nextRoundTime);
    const now = new Date();
    const nextRoundStart = new Date(nextRoundStatus.roundStart);

    // Only create next round if it has already started
    if (nextRoundStart <= now) {
      const nextRoundId = getRoundId(nextRoundStatus, 'NAMED_POWERLADDER5');
      const nextRoundNumber = nextRoundStatus.roundNumber;

      await this.createRoundPowerladder(
        nextRoundId,
        nextRoundNumber,
        nextRoundStatus,
        'named_powerladder5',
      );
    }
  }

  /**
   * Trigger betting result processing for NAMED_POWERLADDER3
   */
  private async triggerBettingResultProcessingPowerladder3(): Promise<void> {
    try {
      await this.queueService.addBettingResultJob({
        game: 'named_powerladder3',
        roundDay: 'scan_all',
      });
    } catch (error: any) {
      this.logger.warn(
        'Failed to trigger betting result processing for NAMED_POWERLADDER3',
        {
          error: error.message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Trigger betting result processing for NAMED_POWERLADDER5
   */
  private async triggerBettingResultProcessingPowerladder5(): Promise<void> {
    try {
      await this.queueService.addBettingResultJob({
        game: 'named_powerladder5',
        roundDay: 'scan_all',
      });
    } catch (error: any) {
      this.logger.warn(
        'Failed to trigger betting result processing for NAMED_POWERLADDER5',
        {
          error: error.message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Publish previous round result for NAMED_POWERLADDER3
   */
  private async publishPreviousRoundResultPowerladder3(
    currentRoundNumber: number,
  ): Promise<void> {
    try {
      let previousRoundNumber = currentRoundNumber - 1;
      if (previousRoundNumber < 1) {
        previousRoundNumber = GAME_CONFIGS.NAMED_POWERLADDER3.roundsPerDay;
      }

      // Get current round status to use as reference for calculating previous round
      const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER3');

      // Calculate previous round status with correct date handling
      const previousRoundStatus = getRoundStatusForRoundNumber(
        'NAMED_POWERLADDER3',
        previousRoundNumber,
        new Date(currentRoundStatus.roundStart),
      );

      // Get correct round ID (handles round 1 starting early at 23:59:35)
      const previousRoundId = getRoundId(previousRoundStatus, 'NAMED_POWERLADDER3');

      const previousRoundResult =
        await this.powerladder3RoundService.getRoundByRoundDay(previousRoundId);

      if (previousRoundResult) {
        // Validate results
        const hasValidResults =
          previousRoundResult.data1 &&
          (previousRoundResult.data1 === 'res_odd' ||
            previousRoundResult.data1 === 'res_even') &&
          previousRoundResult.data2 &&
          (previousRoundResult.data2 === 'line3' ||
            previousRoundResult.data2 === 'line4') &&
          previousRoundResult.data3 &&
          (previousRoundResult.data3 === 'left' || previousRoundResult.data3 === 'right');

        if (!hasValidResults) {
          throw new Error(
            `Previous round result has invalid data for NAMED_POWERLADDER: round ${previousRoundNumber}`,
          );
        }

        // Map database values to bet keys (same logic as round-results.controller.ts)
        const resultOddEven =
          previousRoundResult.data1 === 'res_odd'
            ? 'odd'
            : previousRoundResult.data1 === 'res_even'
              ? 'even'
              : previousRoundResult.data1;
        const lineCount = previousRoundResult.data2;
        const startPoint = previousRoundResult.data3;

        const combinations = {
          left_3_even:
            startPoint === 'left' && lineCount === 'line3' && resultOddEven === 'even',
          right_3_odd:
            startPoint === 'right' && lineCount === 'line3' && resultOddEven === 'odd',
          left_4_odd:
            startPoint === 'left' && lineCount === 'line4' && resultOddEven === 'odd',
          right_4_even:
            startPoint === 'right' && lineCount === 'line4' && resultOddEven === 'even',
        };

        const winningCombination =
          Object.keys(combinations).find((key) => combinations[key]) || null;

        await this.redisService.publishEvent('minigame:round:result', {
          game: 'named_powerladder3',
          round_day: previousRoundId,
          round_number: previousRoundNumber,
          result_data: {
            line: lineCount,
            start_point: startPoint,
            odd_even: resultOddEven,
            // left_3_even: combinations.left_3_even,
            // right_3_odd: combinations.right_3_odd,
            // left_4_odd: combinations.left_4_odd,
            // right_4_even: combinations.right_4_even,
            winning_combination: winningCombination,
          },
          created_at: previousRoundResult.regDate,
        });
      } else {
        throw new Error(
          `Previous round result not found for NAMED_POWERLADDER3: ${previousRoundId}`,
        );
      }
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }

  /**
   * Publish previous round result for NAMED_POWERLADDER5
   */
  private async publishPreviousRoundResultPowerladder5(
    currentRoundNumber: number,
  ): Promise<void> {
    try {
      let previousRoundNumber = currentRoundNumber - 1;
      if (previousRoundNumber < 1) {
        previousRoundNumber = GAME_CONFIGS.NAMED_POWERLADDER5.roundsPerDay;
      }

      // Get current round status to use as reference for calculating previous round
      const currentRoundStatus = getGameRoundStatus('NAMED_POWERLADDER5');

      // Calculate previous round status with correct date handling
      const previousRoundStatus = getRoundStatusForRoundNumber(
        'NAMED_POWERLADDER5',
        previousRoundNumber,
        new Date(currentRoundStatus.roundStart),
      );

      // Get correct round ID (handles round 1 starting early at 23:59:35)
      const previousRoundId = getRoundId(previousRoundStatus, 'NAMED_POWERLADDER5');

      const previousRoundResult =
        await this.powerladder5RoundService.getRoundByRoundDay(previousRoundId);

      if (previousRoundResult) {
        // Validate results
        const hasValidResults =
          previousRoundResult.data1 &&
          (previousRoundResult.data1 === 'res_odd' ||
            previousRoundResult.data1 === 'res_even') &&
          previousRoundResult.data2 &&
          (previousRoundResult.data2 === 'line3' ||
            previousRoundResult.data2 === 'line4') &&
          previousRoundResult.data3 &&
          (previousRoundResult.data3 === 'left' || previousRoundResult.data3 === 'right');

        if (!hasValidResults) {
          throw new Error(
            `Previous round result has invalid data for NAMED_POWERLADDER: round ${previousRoundNumber}`,
          );
        }

        // Map database values to bet keys (same logic as round-results.controller.ts)
        const resultOddEven =
          previousRoundResult.data1 === 'res_odd'
            ? 'odd'
            : previousRoundResult.data1 === 'res_even'
              ? 'even'
              : previousRoundResult.data1;
        const lineCount = previousRoundResult.data2;
        const startPoint = previousRoundResult.data3;

        const combinations = {
          left_3_even:
            startPoint === 'left' && lineCount === 'line3' && resultOddEven === 'even',
          right_3_odd:
            startPoint === 'right' && lineCount === 'line3' && resultOddEven === 'odd',
          left_4_odd:
            startPoint === 'left' && lineCount === 'line4' && resultOddEven === 'odd',
          right_4_even:
            startPoint === 'right' && lineCount === 'line4' && resultOddEven === 'even',
        };

        const winningCombination =
          Object.keys(combinations).find((key) => combinations[key]) || null;

        await this.redisService.publishEvent('minigame:round:result', {
          game: 'named_powerladder5',
          round_day: previousRoundId,
          round_number: previousRoundNumber,
          result_data: {
            line: lineCount,
            start_point: startPoint,
            odd_even: resultOddEven,
            // left_3_even: combinations.left_3_even,
            // right_3_odd: combinations.right_3_odd,
            // left_4_odd: combinations.left_4_odd,
            // right_4_even: combinations.right_4_even,
            winning_combination: winningCombination,
          },
          created_at: previousRoundResult.regDate,
        });
      } else {
        throw new Error(
          `Previous round result not found for NAMED_POWERLADDER5: ${previousRoundId}`,
        );
      }
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }

  /**
   * Create or update round in minigame_round table
   * If round exists, update start_datetime and end_datetime
   * @returns true if round was created (new), false if updated (existing)
   */
  private async createOrUpdateRound(
    gameName: string,
    roundId: string,
    roundNumber: number,
    startTime: Date,
    endTime: Date,
    now: Date,
  ): Promise<boolean> {
    const existing = await this.minigameRoundService.findByRoundId(roundId, gameName);

    if (existing) {
      // Only update if the new start_time is different and valid
      // Don't update if the existing round already has a valid start_time
      const existingStartTime = existing.startDatetime
        ? new Date(existing.startDatetime)
        : null;

      // Only update if:
      // 1. Existing round doesn't have a start_time, OR
      // 2. New start_time is earlier than or equal to existing start_time (to prevent overwriting with later times)
      const shouldUpdate =
        !existingStartTime || startTime.getTime() <= existingStartTime.getTime();

      if (shouldUpdate) {
        await this.minigameRoundService.saveRound({
          providerId: 1, // All games use provider ID 1
          game: gameName,
          round: roundId,
          startDatetime: startTime,
          endDatetime: endTime,
          startTime: startTime.toISOString().split('T')[1].slice(0, 8),
          endTime: endTime.toISOString().split('T')[1].slice(0, 8),
        });
      }
      return false; // Round was updated (or skipped), not created
    } else {
      // Create new round
      await this.minigameRoundService.createRound({
        round_day: roundId,
        round_number: roundNumber,
        game_name: gameName,
        start_time: startTime,
        end_time: endTime,
        status: startTime <= now ? 'active' : 'not_started',
      });
      return true; // Round was created
    }
  }

  /**
   * Generic helper to process continuous games with no-result handling
   * For space8, runningball54, runningball3: when round N has no results, create N+1 only and publish immediately
   * Only processes the largest round (index 0) from socket data
   * Uses cache to ensure rounds are only created when expected round is received
   */
  private async processContinuousGameWithNoResultHandling(
    data: any[],
    gameName: string,
    gameKey: keyof typeof GAME_CONFIGS,
    isValidResult: (item: any) => boolean,
    parseRoundNumber: (item: any) => number,
    offsetMs: number,
    processPreviousRoundsBatchFn: (
      roundsData: any[],
      currentRoundNumber: number,
      currentRoundStartTime: Date,
      intervalMs: number,
    ) => Promise<void>,
    publishRoundResultFn: (roundNumber: number) => Promise<string | null>,
    getBettingOptionsFn: (gcValue: any) => any,
    useAllDataForFiltering: boolean = false,
    resultPublishDelayMs: number, // Delay in milliseconds before publishing result
    receivedTimestamp: Date,
  ): Promise<void> {
    if (data.length === 0) return;

    const config = GAME_CONFIGS[gameKey];
    const roundsPerDay = config.roundsPerDay;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const now = new Date();
    const TZ_OFFSET = 9; // UTC+9 (Korea time)

    // Only process the largest round (index 0) from socket data
    const roundData = data[0];
    const receivedRoundNumber = parseRoundNumber(roundData);
    const hasValidResults = isValidResult(roundData);

    // Get current cache
    const waitingRound = await this.getWaitingRound(gameName);

    // Calculate next round number
    const nextRoundNumber = this.getNextRoundNumber(receivedRoundNumber, roundsPerDay);
    const roundNPlus1Number = nextRoundNumber;

    // Calculate round N+1 start time
    let roundNPlus1StartTime: Date;
    if (hasValidResults) {
      const rawStartTime = receivedTimestamp.getTime() - offsetMs;
      const roundedStartTime = Math.floor(rawStartTime / intervalMs) * intervalMs;
      roundNPlus1StartTime = new Date(roundedStartTime);
    } else {
      roundNPlus1StartTime = new Date(receivedTimestamp);
    }
    const roundNPlus1EndTime = new Date(roundNPlus1StartTime.getTime() + intervalMs);

    // Cache logic with "skip first beat" mechanism:
    // When received round differs from cache, skip the first beat to ensure accurate timing
    // 1. If cache is empty → skip first beat, update cache = received round + 1, don't process
    // 2. If cache > received round → skip first beat, wait for cache value
    // 3. If cache < received round → skip first beat, update cache = received round + 1, don't process
    // 4. If received round = cache → process

    let shouldProcess = false;

    if (!waitingRound) {
      // Cache is empty: skip first beat, update cache = received round + 1, don't process
      await this.setWaitingRound(
        gameName,
        this.getNextRoundNumber(receivedRoundNumber, roundsPerDay),
      );
      return;
    } else {
      const comparison = this.compareRounds(
        receivedRoundNumber,
        waitingRound,
        roundsPerDay,
      );

      if (comparison < 0) {
        // Cache > received round → skip first beat, wait for cache value
        await processPreviousRoundsBatchFn(
          data.filter(isValidResult),
          roundNPlus1Number,
          roundNPlus1StartTime,
          intervalMs,
        );
        return;
      }

      if (comparison > 0) {
        // Cache < received round → skip first beat, update cache = received round + 1, don't process
        await this.setWaitingRound(
          gameName,
          this.getNextRoundNumber(receivedRoundNumber, roundsPerDay),
        );
        return;
      }

      // comparison === 0: received round = cache → process
      shouldProcess = true;
    }

    if (!shouldProcess) {
      return;
    }

    // Special handling when round N has no results
    if (!hasValidResults) {
      const roundNPlus1Id = createRoundIdFromStartTime(
        roundNPlus1StartTime,
        roundNPlus1Number,
        TZ_OFFSET,
      );

      const existingRoundNPlus1 = await this.minigameRoundService.findByRoundId(
        roundNPlus1Id,
        gameName,
      );

      // If round N+1 exists, force update with new start_time
      if (existingRoundNPlus1) {
        await this.minigameRoundService.saveRound({
          providerId: 1,
          game: gameName,
          round: roundNPlus1Id,
          startDatetime: roundNPlus1StartTime,
          endDatetime: roundNPlus1EndTime,
          startTime: roundNPlus1StartTime.toISOString().split('T')[1].slice(0, 8),
          endTime: roundNPlus1EndTime.toISOString().split('T')[1].slice(0, 8),
        });
      } else {
        // Create round N+1 only (no N+2 when no results)
        await this.createOrUpdateRound(
          gameName,
          roundNPlus1Id,
          roundNPlus1Number,
          roundNPlus1StartTime,
          roundNPlus1EndTime,
          now,
        );
      }

      // Publish round:new event immediately
      const gameConfig = await this.gameConfigService.getGameConfigByKey(gameName);
      if (gameConfig) {
        const gcValue = JSON.parse(gameConfig.gcValue);
        const gameOptionsData = {
          round_day: roundNPlus1Id,
          start_time: Math.floor(roundNPlus1StartTime.getTime() / 1000),
          end_time: Math.floor(roundNPlus1EndTime.getTime() / 1000),
          now: Math.floor(Date.now() / 1000),
          blocking_time: gcValue.gcTimeBet || 25,
          max_bet_payout: gcValue.gcMaxBetPayout?.['1'] || 10000000,
          min_bet_amount: gcValue.gcMinBetAmount?.['1'] || 2000,
          max_bet_amount: gcValue.gcMaxBetAmount?.['1'] || 2000000,
          bet_data: getBettingOptionsFn(gcValue),
        };

        await this.redisService.publishEvent('minigame:round:new', {
          game: gameName,
          round: roundNPlus1Id,
          round_number: roundNPlus1Number,
          start_time: roundNPlus1StartTime.toISOString(),
          end_time: roundNPlus1EndTime.toISOString(),
          game_options: gameOptionsData,
          timestamp: new Date().toISOString(),
        });
      }

      // Update cache to next waiting round (N+1)
      await this.setWaitingRound(gameName, roundNPlus1Number);

      // Schedule publish result for round N after delay
      setTimeout(() => {
        void this.publishPreviousRoundResultWithRetry(
          () => publishRoundResultFn(receivedRoundNumber),
          receivedRoundNumber,
          gameName,
        ).then((roundDay) => {
          // Trigger betting result processing after publishing result
          if (roundDay) {
            void this.queueService.addBettingResultJob({
              game: gameName,
              roundDay,
            });
          }
        });
      }, resultPublishDelayMs);

      // Process previous rounds batch
      const validRounds = data.filter(isValidResult);
      if (validRounds.length > 0) {
        await processPreviousRoundsBatchFn(
          validRounds,
          roundNPlus1Number,
          roundNPlus1StartTime,
          intervalMs,
        );
      }

      return;
    }

    // If round N has valid results, use original logic (create N+1, N+2)
    await this.processContinuousGame(
      data,
      gameName,
      gameKey,
      isValidResult,
      parseRoundNumber,
      offsetMs,
      processPreviousRoundsBatchFn,
      () => Promise.resolve(), // Not used when hasValidResults
      getBettingOptionsFn,
      useAllDataForFiltering,
      resultPublishDelayMs,
      receivedTimestamp,
    );
  }

  /**
   * Generic helper to process continuous games (rball56, runningball54, runningball3, space8)
   * Only processes the largest round (index 0) from socket data
   * Uses cache to ensure rounds are only created when expected round is received
   *
   * Cache logic:
   * - If cache is empty → set cache = largestRound + 1, don't process
   * - If received round = cache → create rounds cache+1, cache+2, update cache = cache+1
   * - If cache > received round → skip, wait for cache value
   * - If cache < received round → update cache = received round + 1, don't process
   */
  private async processContinuousGame(
    data: any[],
    gameName: string,
    gameKey: keyof typeof GAME_CONFIGS,
    isValidResult: (item: any) => boolean,
    parseRoundNumber: (item: any) => number,
    offsetMs: number,
    processPreviousRoundsBatchFn: (
      roundsData: any[],
      currentRoundNumber: number,
      currentRoundStartTime: Date,
      intervalMs: number,
    ) => Promise<void>,
    publishPreviousRoundResultFn: (roundNumber: number) => Promise<void>,
    getBettingOptionsFn: (gcValue: any) => any,
    useAllDataForFiltering: boolean = false,
    resultPublishDelayMs: number = 120000, // Default 2 minutes for runningball games
    receivedTimestamp: Date,
  ): Promise<void> {
    if (data.length === 0) return;

    const config = GAME_CONFIGS[gameKey];
    const roundsPerDay = config.roundsPerDay;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const now = new Date();
    const TZ_OFFSET = 9; // UTC+9 (Korea time)

    // Only process the largest round (index 0) from socket data
    const roundData = data[0];
    const receivedRoundNumber = parseRoundNumber(roundData);
    const hasValidResults = isValidResult(roundData);

    // Get current cache
    const waitingRound = await this.getWaitingRound(gameName);

    // Calculate next round number (largest round + 1)
    const nextRoundNumber = this.getNextRoundNumber(receivedRoundNumber, roundsPerDay);
    const roundNPlus1Number = nextRoundNumber;

    // Cache logic with "skip first beat" mechanism:
    // When received round differs from cache, skip the first beat to ensure accurate timing
    // 1. If cache is empty → process (create rounds N+1, N+2) and set cache = N+1
    // 2. If cache > received round → skip first beat, wait for cache value
    // 3. If cache < received round → skip first beat, update cache = received round + 1, don't process
    // 4. If received round = cache → process (create rounds cache+1, cache+2)

    let roundNPlus1StartTime: Date;
    if (hasValidResults) {
      const rawStartTime = receivedTimestamp.getTime() - offsetMs;
      const roundedStartTime = Math.floor(rawStartTime / intervalMs) * intervalMs;
      roundNPlus1StartTime = new Date(roundedStartTime);
    } else {
      roundNPlus1StartTime = new Date(receivedTimestamp);
    }
    const roundNPlus1EndTime = new Date(roundNPlus1StartTime.getTime() + intervalMs);

    const persistPreviousRounds = async (): Promise<void> => {
      const validRounds = data.filter(isValidResult);
      const roundsForFiltering = useAllDataForFiltering ? data : validRounds;
      const previousRoundsData = filterRoundsForProcessing(
        roundsForFiltering,
        roundNPlus1Number,
        roundsPerDay,
        parseRoundNumber,
      );

      if (previousRoundsData.length === 0) {
        return;
      }

      await processPreviousRoundsBatchFn(
        previousRoundsData,
        roundNPlus1Number,
        roundNPlus1StartTime,
        intervalMs,
      );
    };

    let shouldProcess = false;

    if (!waitingRound) {
      // Cache is empty: first time receiving data, process immediately
      shouldProcess = true;
      // this.logger.debug(
      //   `Cache empty for ${gameName}: received=${receivedRoundNumber}, will create rounds ${nextRoundNumber} and ${this.getNextRoundNumber(nextRoundNumber, roundsPerDay)}`,
      //   {},
      //   'MinigameSocketDataProcessor',
      // );
    } else {
      // Compare received round with cache
      const comparison = this.compareRounds(
        receivedRoundNumber,
        waitingRound,
        roundsPerDay,
      );

      if (comparison < 0) {
        // Cache > received round → skip first beat, wait for cache value
        // this.logger.debug(
        //   `Skipping first beat for ${gameName}: cache (${waitingRound}) > received round (${receivedRoundNumber}), waiting for cache value`,
        //   {},
        //   'MinigameSocketDataProcessor',
        // );
        await persistPreviousRounds();
        return;
      }

      if (comparison > 0) {
        // Cache < received round → skip first beat, update cache = received round + 1, don't process
        // This ensures accurate timing on the next beat
        await this.setWaitingRound(gameName, nextRoundNumber);
        // this.logger.debug(
        //   `Skipping first beat for ${gameName}: cache (${waitingRound}) < received round (${receivedRoundNumber}), updating cache to ${nextRoundNumber}`,
        //   {},
        //   'MinigameSocketDataProcessor',
        // );
        return;
      }

      // comparison === 0: received round = cache → process
      shouldProcess = true;
      // this.logger.debug(
      //   `Cache (${waitingRound}) = received round (${receivedRoundNumber}) for ${gameName}: will create rounds ${nextRoundNumber} and ${this.getNextRoundNumber(nextRoundNumber, roundsPerDay)}`,
      //   {},
      //   'MinigameSocketDataProcessor',
      // );
    }

    // Process: create rounds N+1 and N+2
    if (shouldProcess) {
      let roundNPlus1Created = false;
      const roundNPlus1Id = createRoundIdFromStartTime(
        roundNPlus1StartTime,
        roundNPlus1Number,
        TZ_OFFSET,
      );

      const existingRoundNPlus1 = await this.minigameRoundService.findByRoundId(
        roundNPlus1Id,
        gameName,
      );

      // If round N has no results and round N+1 exists, force update with new start_time
      if (existingRoundNPlus1 && !hasValidResults) {
        await this.minigameRoundService.saveRound({
          providerId: 1,
          game: gameName,
          round: roundNPlus1Id,
          startDatetime: roundNPlus1StartTime,
          endDatetime: roundNPlus1EndTime,
          startTime: roundNPlus1StartTime.toISOString().split('T')[1].slice(0, 8),
          endTime: roundNPlus1EndTime.toISOString().split('T')[1].slice(0, 8),
        });
        // Update cache to next waiting round (N+1)
        await this.setWaitingRound(gameName, roundNPlus1Number);
        return;
      }

      // Create round N+1 if it doesn't exist
      if (!existingRoundNPlus1) {
        // Calculate round N+2
        let roundNPlus2Number = roundNPlus1Number + 1;
        if (roundNPlus2Number > roundsPerDay) {
          roundNPlus2Number = 1;
        }
        const roundNPlus2StartTime = new Date(roundNPlus1EndTime);
        const roundNPlus2EndTime = new Date(roundNPlus2StartTime.getTime() + intervalMs);
        const roundNPlus2Id = createRoundIdFromStartTime(
          roundNPlus2StartTime,
          roundNPlus2Number,
          TZ_OFFSET,
        );

        // Create round N+1
        roundNPlus1Created = await this.createOrUpdateRound(
          gameName,
          roundNPlus1Id,
          roundNPlus1Number,
          roundNPlus1StartTime,
          roundNPlus1EndTime,
          now,
        );

        // Create round N+2 if it doesn't exist
        const existingRoundNPlus2 = await this.minigameRoundService.findByRoundId(
          roundNPlus2Id,
          gameName,
        );
        if (!existingRoundNPlus2) {
          await this.createOrUpdateRound(
            gameName,
            roundNPlus2Id,
            roundNPlus2Number,
            roundNPlus2StartTime,
            roundNPlus2EndTime,
            now,
          );
        }

        // Publish round:new event when round is created
        if (roundNPlus1Created) {
          const gameConfig = await this.gameConfigService.getGameConfigByKey(gameName);
          if (gameConfig) {
            const gcValue = JSON.parse(gameConfig.gcValue);
            const gameOptionsData = {
              round_day: roundNPlus1Id,
              start_time: Math.floor(roundNPlus1StartTime.getTime() / 1000),
              end_time: Math.floor(roundNPlus1EndTime.getTime() / 1000),
              now: Math.floor(Date.now() / 1000),
              blocking_time: gcValue.gcTimeBet || 25,
              max_bet_payout: gcValue.gcMaxBetPayout?.['1'] || 10000000,
              min_bet_amount: gcValue.gcMinBetAmount?.['1'] || 2000,
              max_bet_amount: gcValue.gcMaxBetAmount?.['1'] || 2000000,
              bet_data: getBettingOptionsFn(gcValue),
            };

            await this.redisService.publishEvent('minigame:round:new', {
              game: gameName,
              round: roundNPlus1Id,
              round_number: roundNPlus1Number,
              start_time: roundNPlus1StartTime.toISOString(),
              end_time: roundNPlus1EndTime.toISOString(),
              game_options: gameOptionsData,
              timestamp: new Date().toISOString(),
            });

          }
        }
      } else {
        // Round N+1 already exists and has results, skip
        // this.logger.debug(
        //   `Round ${roundNPlus1Id} already exists for ${gameName}, skipping`,
        //   {},
        //   'MinigameSocketDataProcessor',
        // );
      }

      // Update cache to next waiting round (N+1) after processing
      await this.setWaitingRound(gameName, roundNPlus1Number);

      if (hasValidResults) {
        setTimeout(async () => {
          await this.publishPreviousRoundResultWithRetry(
            publishPreviousRoundResultFn,
            roundNPlus1Number,
            gameName,
          );
        }, resultPublishDelayMs);
      }
    }

    // Process previous rounds batch
    await persistPreviousRounds();
  }

  /**
   * Process NAMED_RBALL_56 data
   * Rball56 always receives data with valid results (no ball_1="0")
   * Special logic:
   * - When receiving round N: create round N+2 with start = now + 3min, end = start + 5min
   *   Schedule round:new and round:result for round N after 3 minutes
   * - When receiving round N+1: create round N+3 with start = now + 3min, end = start + 5min
   *   Schedule round:new for round N+3 after 3 minutes, publish round:result for round N+1 immediately
   * Uses cache to ensure rounds are only created when expected round is received
   */
  private async processNamedRball56(data: any[]): Promise<void> {
    if (data.length === 0) return;

    const config = GAME_CONFIGS.NAMED_RBALL_56;
    const roundsPerDay = config.roundsPerDay;
    const intervalMs = config.intervalMinutes * 60 * 1000; // 5 minutes
    const now = new Date();
    const TZ_OFFSET = 9; // UTC+9 (Korea time)

    // Only process the largest round (index 0) from socket data
    const roundData = data[0];
    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;
    const receivedRoundNumber = parseRoundNumber(roundData);

    // Get current cache
    const waitingRound = await this.getWaitingRound('named_rball_56');

    // Calculate next round number (N+2)
    const roundNPlus2Number = this.getNextRoundNumber(
      this.getNextRoundNumber(receivedRoundNumber, roundsPerDay),
      roundsPerDay,
    );

    // Cache logic with "skip first beat" mechanism:
    // 1. If cache is empty → skip first beat, update cache = received round + 1, don't process
    // 2. If cache > received round → skip first beat, wait for cache value
    // 3. If cache < received round → skip first beat, update cache = received round + 1, don't process
    // 4. If received round = cache → process

    let shouldProcess = false;

    if (!waitingRound) {
      // Cache is empty: skip first beat, update cache = received round + 1, don't process
      await this.setWaitingRound(
        'named_rball_56',
        this.getNextRoundNumber(receivedRoundNumber, roundsPerDay),
      );
      return;
    } else {
      const comparison = this.compareRounds(
        receivedRoundNumber,
        waitingRound,
        roundsPerDay,
      );

      if (comparison < 0) {
        // Cache > received round → skip first beat, wait for cache value
        await this.processPreviousRoundsBatchRball56(
          data.filter((item) => {
            const ballsOk =
              item.ball_1 !== '0' &&
              item.ball_2 !== '0' &&
              item.ball_3 !== '0' &&
              item.ball_4 !== '0' &&
              item.ball_5 !== '0' &&
              item.ball_6 !== '0';
            const dataOk =
              item.ball_odd_even &&
              item.ball_unover &&
              item.ball3_odd_even &&
              item.ball3_unover;
            return ballsOk && dataOk;
          }),
          roundNPlus2Number,
          new Date(now.getTime() + 3 * 60 * 1000), // now + 3 minutes
          intervalMs,
        );
        return;
      }

      if (comparison > 0) {
        // Cache < received round → skip first beat, update cache = received round + 1, don't process
        await this.setWaitingRound(
          'named_rball_56',
          this.getNextRoundNumber(receivedRoundNumber, roundsPerDay),
        );
        return;
      }

      // comparison === 0: received round = cache → process
      shouldProcess = true;
    }

    if (!shouldProcess) {
      return;
    }

    // Receiving round N, cache expect N -> round N appears for the first time
    // Update cache FIRST to prevent duplicate processing if called multiple times in same beat
    // Then schedule round:new and publish round:result
    
    // Update cache to next waiting round (N+1) IMMEDIATELY to prevent duplicates
    await this.setWaitingRound(
      'named_rball_56',
      this.getNextRoundNumber(receivedRoundNumber, roundsPerDay),
    );

    // Create round N+2 with start_datetime = now + 3 minutes, end_datetime = start + 5 minutes
    const roundNPlus2StartTime = new Date(now.getTime() + 3 * 60 * 1000); // now + 3 minutes
    const roundNPlus2EndTime = new Date(roundNPlus2StartTime.getTime() + intervalMs); // start + 5 minutes
    const roundNPlus2Id = createRoundIdFromStartTime(
      roundNPlus2StartTime,
      roundNPlus2Number,
      TZ_OFFSET,
    );

    const existingRoundNPlus2 = await this.minigameRoundService.findByRoundId(
      roundNPlus2Id,
      'named_rball_56',
    );

    if (!existingRoundNPlus2) {
      await this.createOrUpdateRound(
        'named_rball_56',
        roundNPlus2Id,
        roundNPlus2Number,
        roundNPlus2StartTime,
        roundNPlus2EndTime,
        now,
      );
    }

    // Schedule round:new for round N+2 after 3 minutes
    setTimeout(() => {
      void this.publishRoundNewRball56(
        roundNPlus2Id,
        roundNPlus2Number,
        roundNPlus2StartTime,
        roundNPlus2EndTime,
      );
    }, 3 * 60 * 1000); // 3 minutes

    // Publish round:result for round N immediately and trigger betting result processing
    const roundDay = await this.publishPreviousRoundResultWithRetry(
      () => this.publishRoundResultRball56(receivedRoundNumber),
      receivedRoundNumber,
      'named_rball_56',
    );

    // Trigger betting result processing immediately after publishing result
    if (roundDay) {
      await this.queueService.addBettingResultJob({
        game: 'named_rball_56',
        roundDay,
      });
    }

    // Process previous rounds batch
    const validRounds = data.filter((item) => {
      const ballsOk =
        item.ball_1 !== '0' &&
        item.ball_2 !== '0' &&
        item.ball_3 !== '0' &&
        item.ball_4 !== '0' &&
        item.ball_5 !== '0' &&
        item.ball_6 !== '0';
      const dataOk =
        item.ball_odd_even &&
        item.ball_unover &&
        item.ball3_odd_even &&
        item.ball3_unover;
      return ballsOk && dataOk;
    });

    if (validRounds.length > 0) {
      const currentRoundNumber = roundNPlus2Number;
      const currentRoundStartTime = new Date(now.getTime() + 3 * 60 * 1000);
      await this.processPreviousRoundsBatchRball56(
        validRounds,
        currentRoundNumber,
        currentRoundStartTime,
        intervalMs,
      );
    }
  }

  /**
   * Process NAMED_RUNNINGBALL5_4 data
   * Can receive data with ball_1="0" (no results yet)
   * When receiving round N without results: create round N+1 with start = receivedTimestamp, end = start + 5min
   * Publish round:new immediately, schedule round:result after 90 seconds
   * Uses cache to ensure rounds are only created when expected round is received
   */
  private async processNamedRunningball54(
    data: any[],
    receivedTimestamp: Date,
  ): Promise<void> {
    const isValidResult = (item: any): boolean => {
      const ballsOk =
        item.ball_1 !== '0' &&
        item.ball_2 !== '0' &&
        item.ball_3 !== '0' &&
        item.ball_4 !== '0';
      const dataOk =
        item.ball_odd_even &&
        item.ball_unover &&
        item.ball3_odd_even &&
        item.ball3_unover;
      return ballsOk && dataOk;
    };

    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;
    const offsetMs = 2 * 60 * 1000; // Results arrive ~2 minutes after round ends

    const { getNamedRunningball54BettingOptions } = await import(
      '../../../domains/game/constants/betting-options.const'
    );

    await this.processContinuousGameWithNoResultHandling(
      data,
      'named_runningball5_4',
      'NAMED_RUNNINGBALL5_4',
      isValidResult,
      parseRoundNumber,
      offsetMs,
      (roundsData, currentRoundNumber, currentRoundStartTime, intervalMs) =>
        this.processPreviousRoundsBatchRunningball54(
          roundsData,
          currentRoundNumber,
          currentRoundStartTime,
          intervalMs,
        ),
      (roundNumber) => this.publishRoundResultRunningball54(roundNumber),
      getNamedRunningball54BettingOptions,
      true, // useAllDataForFiltering
      110 * 1000, // resultPublishDelayMs: 110 seconds
      receivedTimestamp,
    );
  }

  /**
   * Process multiple previous rounds in batch for NAMED_RBALL_56
   * Uses date_round from socket data and currentRoundStartTime to calculate round IDs
   */
  private async processPreviousRoundsBatchRball56(
    roundsData: any[],
    currentRoundNumber: number,
    currentRoundStartTime: Date,
    intervalMs: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const TZ_OFFSET = 9; // UTC+9 (Korea time)
    const TZ_OFFSET_MS = TZ_OFFSET * 60 * 60 * 1000;

    const parseRoundNumber = (roundData: any) => parseInt(roundData.date_round) % 1000;
    // Keep only valid result rows (skip zero/empty payloads)
    const isValidResult = (item: any) => {
      const ballsOk =
        item.ball_1 !== '0' &&
        item.ball_2 !== '0' &&
        item.ball_3 !== '0' &&
        item.ball_4 !== '0' &&
        item.ball_5 !== '0' &&
        item.ball_6 !== '0';
      const dataOk =
        item.ball_odd_even &&
        item.ball_unover &&
        item.ball3_odd_even &&
        item.ball3_unover;
      return ballsOk && dataOk;
    };

    const validRounds = roundsData.filter(isValidResult);
    if (validRounds.length === 0) {
      // Nothing valid to persist/publish
      return;
    }

    const batchData = validRounds.map((roundData) => {
      const roundNumber = parseRoundNumber(roundData);

      // Calculate round start time: currentRoundStartTime - (currentRoundNumber - roundNumber) * intervalMs
      const roundDiff = currentRoundNumber - roundNumber;
      const roundStartTime = new Date(
        currentRoundStartTime.getTime() - roundDiff * intervalMs,
      );
      const roundEndTime = new Date(roundStartTime.getTime() + intervalMs);

      // Calculate round ID from round start time in Korea timezone
      const roundId = createRoundIdFromStartTime(roundStartTime, roundNumber, TZ_OFFSET);

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_RBALL_56',
        ball_1: roundData.ball_1,
        ball_2: roundData.ball_2,
        ball_3: roundData.ball_3,
        ball_4: roundData.ball_4,
        ball_5: roundData.ball_5,
        ball_6: roundData.ball_6,
        ball_odd_even: roundData.ball_odd_even,
        ball_unover: roundData.ball_unover,
        ball3_odd_even: roundData.ball3_odd_even,
        ball3_unover: roundData.ball3_unover,
        result_time: roundEndTime,
      };
    });

    await this.rball56RoundService.upsertRoundsBatch(batchData);

    // Trigger betting result processing for the first round in batch
    if (batchData.length > 0 && batchData[0].round_day) {
      await this.queueService.addBettingResultJob({
        game: 'named_rball_56',
        roundDay: batchData[0].round_day,
      });
    }

    // Do not publish here to avoid duplicates; publish previous round once after new round starts (delayed)
  }

  /**
   * Process multiple previous rounds in batch for NAMED_RUNNINGBALL5_4
   */
  /**
   * Process multiple previous rounds in batch for NAMED_RUNNINGBALL5_4
   * Uses date_round from socket data and currentRoundStartTime to calculate round IDs
   */
  private async processPreviousRoundsBatchRunningball54(
    roundsData: any[],
    currentRoundNumber: number,
    currentRoundStartTime: Date,
    intervalMs: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const TZ_OFFSET = 9; // UTC+9 (Korea time)
    const TZ_OFFSET_MS = TZ_OFFSET * 60 * 60 * 1000;

    const parseRoundNumber = (roundData: any) => parseInt(roundData.date_round) % 1000;
    // Keep only valid result rows (skip zero/empty payloads)
    // NAMED_RUNNINGBALL5_4 has 4 balls (ball_1 to ball_4)
    const isValidResult = (item: any) => {
      const ballsOk =
        item.ball_1 !== '0' &&
        item.ball_2 !== '0' &&
        item.ball_3 !== '0' &&
        item.ball_4 !== '0';
      const dataOk =
        item.ball_odd_even &&
        item.ball_unover &&
        item.ball3_odd_even &&
        item.ball3_unover;
      return ballsOk && dataOk;
    };

    const validRounds = roundsData.filter(isValidResult);
    if (validRounds.length === 0) {
      // Nothing valid to persist/publish
      return;
    }

    const batchData = validRounds.map((roundData) => {
      const roundNumber = parseRoundNumber(roundData);

      // Calculate round start time: currentRoundStartTime - (currentRoundNumber - roundNumber) * intervalMs
      const roundDiff = currentRoundNumber - roundNumber;
      const roundStartTime = new Date(
        currentRoundStartTime.getTime() - roundDiff * intervalMs,
      );
      const roundEndTime = new Date(roundStartTime.getTime() + intervalMs);

      // Calculate round ID from round start time in Korea timezone
      const roundId = createRoundIdFromStartTime(roundStartTime, roundNumber, TZ_OFFSET);

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_RUNNINGBALL5_4',
        ball_1: roundData.ball_1,
        ball_2: roundData.ball_2,
        ball_3: roundData.ball_3,
        ball_4: roundData.ball_4,
        ball_5: roundData.ball_5,
        ball_odd_even: roundData.ball_odd_even,
        ball_unover: roundData.ball_unover,
        ball3_odd_even: roundData.ball3_odd_even,
        ball3_unover: roundData.ball3_unover,
        result_time: roundEndTime,
      };
    });

    await this.runningball54RoundService.upsertRoundsBatch(batchData);

    // Trigger betting result processing for the first round in batch
    if (batchData.length > 0 && batchData[0].round_day) {
      await this.queueService.addBettingResultJob({
        game: 'named_runningball5_4',
        roundDay: batchData[0].round_day,
      });
    }

    // Do not publish here to avoid duplicates; publish previous round once after new round starts (delayed)
  }

  /**
   * Publish round:new event for NAMED_RBALL_56
   */
  private async publishRoundNewRball56(
    roundId: string,
    roundNumber: number,
    startTime: Date,
    endTime: Date,
  ): Promise<void> {
    try {
      const gameConfig = await this.gameConfigService.getGameConfigByKey('named_rball_56');
      if (!gameConfig) {
        this.logger.warn(
          'Game config not found for named_rball_56, skipping round:new event',
          {},
          'MinigameSocketDataProcessor',
        );
        return;
      }

      const { getNamedRball56BettingOptions } = await import(
        '../../../domains/game/constants/betting-options.const'
      );
      const gcValue = JSON.parse(gameConfig.gcValue);
      const gameOptionsData = {
        round_day: roundId,
        start_time: Math.floor(startTime.getTime() / 1000),
        end_time: Math.floor(endTime.getTime() / 1000),
        now: Math.floor(Date.now() / 1000),
        blocking_time: gcValue.gcTimeBet || 25,
        max_bet_payout: gcValue.gcMaxBetPayout?.['1'] || 10000000,
        min_bet_amount: gcValue.gcMinBetAmount?.['1'] || 2000,
        max_bet_amount: gcValue.gcMaxBetAmount?.['1'] || 2000000,
        bet_data: getNamedRball56BettingOptions(gcValue),
      };

      await this.redisService.publishEvent('minigame:round:new', {
        game: 'named_rball_56',
        round: roundId,
        round_number: roundNumber,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        game_options: gameOptionsData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        'Failed to publish round:new event for NAMED_RBALL_56',
        { error: (error as Error).message },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Publish round result for NAMED_RBALL_56 (for round N directly)
   */
  private async publishRoundResultRball56(roundNumber: number): Promise<string | null> {
    try {
      const now = new Date();
      const tzOffset = parseInt(
        process.env.TZ_OFFSET_FOR_ROUND?.replace('+', '') || '9',
        10,
      );
      const utcWithOffset = new Date(now.getTime() + tzOffset * 60 * 60 * 1000);
      const currentDate = utcWithOffset.toISOString().split('T')[0];

      const roundResult = await this.rball56RoundService.getRoundByIdentifier(
        currentDate.replaceAll('-', '') +
          '_' +
          roundNumber.toString().padStart(3, '0'),
      );

      if (!roundResult) {
        throw new Error(
          `Round result not found for NAMED_RBALL_56: round ${roundNumber}`,
        );
      }

      const balls = [
        roundResult.balldata1,
        roundResult.balldata2,
        roundResult.balldata3,
        roundResult.balldata4,
        roundResult.balldata5,
        roundResult.balldata6,
      ].filter(Boolean);

      await this.redisService.publishEvent('minigame:round:result', {
        game: 'named_rball_56',
        round_day: roundResult.round,
        round_number: roundNumber,
        balls,
        result_data: {
          first_ball: roundResult.balldata1,
          first_odd_even: roundResult.data1,
          first_under_over: roundResult.data2,
          fist_to_third_odd_even: roundResult.data3,
          fist_to_third_under_over: roundResult.data4,
        },
        created_at: roundResult.regDate,
      });

      return roundResult.round;
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }

  /**
   * Publish round result for NAMED_RUNNINGBALL5_4 (for round N directly)
   */
  private async publishRoundResultRunningball54(roundNumber: number): Promise<string | null> {
    try {
      const now = new Date();
      const tzOffset = parseInt(
        process.env.TZ_OFFSET_FOR_ROUND?.replace('+', '') || '9',
        10,
      );
      const utcWithOffset = new Date(now.getTime() + tzOffset * 60 * 60 * 1000);
      const currentDate = utcWithOffset.toISOString().split('T')[0];

      const roundResult = await this.runningball54RoundService.getRoundByIdentifier(
        currentDate.replaceAll('-', '') +
          '_' +
          roundNumber.toString().padStart(3, '0'),
      );

      if (!roundResult) {
        throw new Error(
          `Round result not found for NAMED_RUNNINGBALL5_4: round ${roundNumber}`,
        );
      }

      const hasValidResults =
        roundResult.balldata1 &&
        roundResult.balldata2 &&
        roundResult.balldata3 &&
        roundResult.balldata4 &&
        roundResult.data1 &&
        roundResult.data2 &&
        roundResult.data3 &&
        roundResult.data4;

      if (!hasValidResults) {
        throw new Error(
          `Round result has invalid data for NAMED_RUNNINGBALL5_4: round ${roundNumber}`,
        );
      }

      const balls = [
        roundResult.balldata1,
        roundResult.balldata2,
        roundResult.balldata3,
        roundResult.balldata4,
      ].filter(Boolean);

      await this.redisService.publishEvent('minigame:round:result', {
        game: 'named_runningball5_4',
        round_day: roundResult.round,
        round_number: roundNumber,
        balls,
        result_data: {
          first_ball: roundResult.balldata1,
          first_odd_even: roundResult.data1,
          first_under_over: roundResult.data2,
          fist_to_third_odd_even: roundResult.data3,
          fist_to_third_under_over: roundResult.data4,
        },
        created_at: roundResult.regDate,
      });

      return roundResult.round;
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }


  /**
   * Process NAMED_RUNNINGBALL3 data
   * Can receive data with ball_1="0" (no results yet)
   * When receiving round N without results: create round N+1 with start = receivedTimestamp, end = start + 5min
   * Publish round:new immediately, schedule round:result after 90 seconds
   * Uses cache to ensure rounds are only created when expected round is received
   */
  private async processNamedRunningball3(
    data: any[],
    receivedTimestamp: Date,
  ): Promise<void> {
    const isValidResult = (item: any): boolean => {
      return item.ball_1 !== '0' && item.ball_2 !== '0' && item.ball_odd_even;
    };

    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;
    const offsetMs = 2 * 60 * 1000; // Results arrive ~2 minutes after round ends

    const { getNamedRunningball3BettingOptions } = await import(
      '../../../domains/game/constants/betting-options.const'
    );

    await this.processContinuousGameWithNoResultHandling(
      data,
      'named_runningball3',
      'NAMED_RUNNINGBALL3',
      isValidResult,
      parseRoundNumber,
      offsetMs,
      (roundsData, currentRoundNumber, currentRoundStartTime, intervalMs) =>
        this.processPreviousRoundsBatchRunningball3(
          roundsData,
          currentRoundNumber,
          currentRoundStartTime,
          intervalMs,
        ),
      (roundNumber) => this.publishRoundResultRunningball3(roundNumber),
      getNamedRunningball3BettingOptions,
      false, // useAllDataForFiltering
      110 * 1000, // resultPublishDelayMs: 110 seconds
      receivedTimestamp,
    );
  }

  /**
   * Process NAMED_SPACE8 data
   * Can receive data with ball_1="0" (no results yet)
   * When receiving round N without results: create round N+1 with start = receivedTimestamp, end = start + 3min
   * Publish round:new immediately, schedule round:result after 60 seconds
   * Uses cache to ensure rounds are only created when expected round is received
   */
  private async processNamedSpace8(data: any[], receivedTimestamp: Date): Promise<void> {
    const isValidResult = (item: any): boolean => {
      return (
        item.ball_1 !== '0' &&
        item.ball_2 !== '0' &&
        item.ball_3 !== '0' &&
        item.ball_4 !== '0' &&
        item.ball_5 !== '0' &&
        item.ball_6 !== '0' &&
        item.ball_7 !== '0' &&
        item.ball_8 !== '0' &&
        item.count_win &&
        item.sum_win &&
        item.sum_home_ball_odd_even &&
        item.sum_away_ball_odd_even &&
        item.home_ball1_odd_even &&
        item.away_ball1_odd_even &&
        item.home_ball1_under_over &&
        item.away_ball1_under_over
      );
    };

    const parseRoundNumber = (item: any) => parseInt(item.date_round) % 1000;
    const offsetMs = 1 * 60 * 1000; // Results arrive 1 minute after round ends

    const { getNamedSpace8BettingOptions } = await import(
      '../../../domains/game/constants/betting-options.const'
    );

    await this.processContinuousGameWithNoResultHandling(
      data,
      'named_space8',
      'NAMED_SPACE8',
      isValidResult,
      parseRoundNumber,
      offsetMs,
      (roundsData, currentRoundNumber, currentRoundStartTime, intervalMs) =>
        this.processPreviousRoundsBatchSpace8(
          roundsData,
          currentRoundNumber,
          currentRoundStartTime,
          intervalMs,
        ),
      (roundNumber) => this.publishRoundResultSpace8(roundNumber),
      getNamedSpace8BettingOptions,
      true, // useAllDataForFiltering
      50 * 1000, // resultPublishDelayMs: 50 seconds
      receivedTimestamp,
    );
  }

  /**
   * Process NAMED_HOLDEM data
   * Similar to NAMED_POWERBALL3: 480 rounds, 3 minutes, uses round.util.ts for round calculation
   */
  private async processNamedHoldem(data: any[]): Promise<void> {
    await this.processPowerball(
      data,
      'NAMED_HOLDEM',
      'named_holdem',
      (item) => parseInt(item.date_round) % 1000,
      (status, roundId, roundNumber) =>
        this.createCurrentRoundHoldem(status, roundId, roundNumber),
      (status) => this.ensureNextRoundHoldem(status),
      (roundsData, currentRoundNumber) =>
        this.processPreviousRoundsBatchHoldem(roundsData, currentRoundNumber),
    );
  }

  /**
   * Create current round for NAMED_HOLDEM
   */
  private async createCurrentRoundHoldem(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
    currentRoundId: string,
    currentRoundNumber: number,
  ): Promise<void> {
    await this.minigameRoundService.createRound({
      round_day: currentRoundId,
      round_number: currentRoundNumber,
      game_name: 'named_holdem',
      start_time: new Date(currentRoundStatus.roundStart),
      end_time: new Date(currentRoundStatus.roundEnd),
      status: currentRoundStatus.status,
    });

    try {
      const gameConfig = await this.gameConfigService.getGameConfigByKey('named_holdem');
      const gcValue = gameConfig ? JSON.parse(gameConfig.gcValue) : {};
      const minBetAmount = gcValue.gcMinBetAmount?.['1'] || 2000;
      const maxBetAmount = gcValue.gcMaxBetAmount?.['1'] || 2000000;
      const maxBetPayout = gcValue.gcMaxBetPayout?.['1'] || 10000000;
      const blockingTime = gcValue.gcTimeBet || 25;

      const { getNamedHoldemBettingOptions } = await import(
        '../../../domains/game/constants/betting-options.const'
      );
      const betData = getNamedHoldemBettingOptions(gcValue);

      const gameOptionsData = {
        round_day: currentRoundId,
        start_time: Math.floor(new Date(currentRoundStatus.roundStart).getTime() / 1000),
        end_time: Math.floor(new Date(currentRoundStatus.roundEnd).getTime() / 1000),
        now: Math.floor(Date.now() / 1000),
        blocking_time: blockingTime,
        max_bet_payout: maxBetPayout,
        min_bet_amount: minBetAmount,
        max_bet_amount: maxBetAmount,
        bet_data: betData,
      };

      await this.redisService.publishEvent('minigame:round:new', {
        game: 'named_holdem',
        round_day: currentRoundId,
        round_number: currentRoundNumber,
        start_time: currentRoundStatus.roundStart,
        end_time: currentRoundStatus.roundEnd,
        game_options: gameOptionsData,
        timestamp: new Date().toISOString(),
      });

      setTimeout(async () => {
        await this.publishPreviousRoundResultWithRetry(
          (roundNumber) => this.publishPreviousRoundResultHoldem(roundNumber),
          currentRoundNumber,
          'named_holdem',
        );
      }, 8000);
    } catch (error) {
      this.logger.error(
        'Failed to publish new round event for NAMED_HOLDEM',
        {
          error: (error as Error).message,
        },
        'MinigameSocketDataProcessor',
      );
    }
  }

  /**
   * Ensure next round exists for NAMED_HOLDEM
   */
  private async ensureNextRoundHoldem(
    currentRoundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    await this.ensureNextRoundPowerball(
      currentRoundStatus,
      'NAMED_HOLDEM',
      (roundId, roundNumber, roundStatus) =>
        this.ensureRoundExistsHoldem(roundId, roundNumber, roundStatus),
    );
  }

  /**
   * Ensure round exists in minigame_round for NAMED_HOLDEM
   */
  private async ensureRoundExistsHoldem(
    roundId: string,
    roundNumber: number,
    roundStatus: ReturnType<typeof getGameRoundStatus>,
  ): Promise<void> {
    const existing = await this.minigameRoundService.findByRoundId(
      roundId,
      'named_holdem',
    );
    if (!existing) {
      await this.minigameRoundService.createRound({
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'named_holdem',
        start_time: new Date(roundStatus.roundStart),
        end_time: new Date(roundStatus.roundEnd),
        status: roundStatus.status,
      });
    }
  }

  /**
   * Process multiple previous rounds in batch for NAMED_HOLDEM
   */
  private async processPreviousRoundsBatchHoldem(
    roundsData: RoundData[],
    currentRoundNumber: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const currentRoundStatus = getGameRoundStatus('NAMED_HOLDEM');
    const config = GAME_CONFIGS.NAMED_HOLDEM;
    const intervalMs = config.intervalMinutes * 60 * 1000;
    const roundsPerDay = config.roundsPerDay;

    const batchData = roundsData.map((roundData) => {
      const roundNumber = parseInt(roundData.date_round) % 1000;

      // Use calculateRoundStatus to get correct baseDatetime
      const roundStatus = calculateRoundStatus(
        'NAMED_HOLDEM',
        roundNumber,
        currentRoundNumber,
        currentRoundStatus,
        intervalMs,
        roundsPerDay,
      );
      const roundId = getRoundId(roundStatus, 'NAMED_HOLDEM');

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_HOLDEM',
        winner_player: roundData.winner_player || null,
        winner_combo: roundData.winner_combo || null,
        result_time: new Date(roundStatus.roundEnd),
      };
    });

    await this.holdemRoundService.upsertRoundsBatch(batchData);

    await this.queueService.addBettingResultJob({
      game: 'named_holdem',
      roundDay: 'scan_all',
    });
  }

  /**
   * Publish previous round result for NAMED_HOLDEM
   */
  private async publishPreviousRoundResultHoldem(
    currentRoundNumber: number,
  ): Promise<void> {
    try {
      let previousRoundNumber = currentRoundNumber - 1;
      if (previousRoundNumber < 1) {
        previousRoundNumber = GAME_CONFIGS.NAMED_HOLDEM.roundsPerDay;
      }

      const now = new Date();
      const tzOffset = parseInt(
        process.env.TZ_OFFSET_FOR_ROUND?.replace('+', '') || '9',
        10,
      );
      const utcWithOffset = new Date(now.getTime() + tzOffset * 60 * 60 * 1000);
      const currentDate = utcWithOffset.toISOString().split('T')[0];

      const previousRoundResult = await this.holdemRoundService.getRoundByIdentifier(
        currentDate.replaceAll('-', '') +
          '_' +
          previousRoundNumber.toString().padStart(3, '0'),
      );

      if (!previousRoundResult) {
        throw new Error(
          `Previous round result not found for NAMED_HOLDEM: round ${previousRoundNumber}`,
        );
      }

      const hasValidResults = previousRoundResult.data1 && previousRoundResult.data2;

      if (!hasValidResults) {
        throw new Error(
          `Previous round result has invalid data for NAMED_HOLDEM: round ${previousRoundNumber}`,
        );
      }

      await this.redisService.publishEvent('minigame:round:result', {
        game: 'named_holdem',
        round_day: previousRoundResult.round,
        round_number: previousRoundNumber,
        result_data: {
          winner_player: previousRoundResult.data1,
          win_combo: previousRoundResult.data2,
        },
        created_at: previousRoundResult.regDate,
      });
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }

  /**
   * Publish round result for NAMED_RUNNINGBALL3 (for round N directly)
   */
  private async publishRoundResultRunningball3(roundNumber: number): Promise<string | null> {
    try {
      const now = new Date();
      const tzOffset = parseInt(
        process.env.TZ_OFFSET_FOR_ROUND?.replace('+', '') || '9',
        10,
      );
      const utcWithOffset = new Date(now.getTime() + tzOffset * 60 * 60 * 1000);
      const currentDate = utcWithOffset.toISOString().split('T')[0];

      const roundResult = await this.runningball3RoundService.getRoundByIdentifier(
        currentDate.replaceAll('-', '') +
          '_' +
          roundNumber.toString().padStart(3, '0'),
      );

      if (!roundResult) {
        throw new Error(
          `Round result not found for NAMED_RUNNINGBALL3: round ${roundNumber}`,
        );
      }

      const hasValidResults =
        roundResult.balldata1 &&
        roundResult.balldata2 &&
        roundResult.data1;

      if (!hasValidResults) {
        throw new Error(
          `Round result has invalid data for NAMED_RUNNINGBALL3: round ${roundNumber}`,
        );
      }

      await this.redisService.publishEvent('minigame:round:result', {
        game: 'named_runningball3',
        round_day: roundResult.round,
        round_number: roundNumber,
        result_data: {
          first_ball: roundResult.balldata1,
          first_odd_even: roundResult.data1,
        },
        created_at: roundResult.regDate,
      });

      return roundResult.round;
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }


  /**
   * Publish round result for NAMED_SPACE8 (for round N directly, not previous round)
   */
  private async publishRoundResultSpace8(roundNumber: number): Promise<string | null> {
    try {
      const now = new Date();
      const tzOffset = parseInt(
        process.env.TZ_OFFSET_FOR_ROUND?.replace('+', '') || '9',
        10,
      );
      const utcWithOffset = new Date(now.getTime() + tzOffset * 60 * 60 * 1000);
      const currentDate = utcWithOffset.toISOString().split('T')[0];

      const roundResult = await this.space8RoundService.getRoundByIdentifier(
        currentDate.replaceAll('-', '') +
          '_' +
          roundNumber.toString().padStart(3, '0'),
      );

      if (!roundResult) {
        throw new Error(
          `Round result not found for NAMED_SPACE8: round ${roundNumber}`,
        );
      }

      const hasValidResults =
        roundResult.balldata1 &&
        roundResult.balldata2 &&
        roundResult.data1 &&
        roundResult.data2 &&
        roundResult.data3 &&
        roundResult.data4 &&
        roundResult.data5 &&
        roundResult.data6 &&
        roundResult.data7 &&
        roundResult.data8;

      if (!hasValidResults) {
        throw new Error(
          `Round result has invalid data for NAMED_SPACE8: round ${roundNumber}`,
        );
      }

      await this.redisService.publishEvent('minigame:round:result', {
        game: 'named_space8',
        round_day: roundResult.round,
        round_number: roundNumber,
        result_data: {
          count_win: roundResult.data1,
          sum_win: roundResult.data2,
          sum_home_odd_even: roundResult.data3,
          sum_away_odd_even: roundResult.data4,
          home_ball1_odd_even: roundResult.data5,
          away_ball1_odd_even: roundResult.data6,
          home_ball1_under_over: roundResult.data7,
          away_ball1_under_over: roundResult.data8,
        },
        created_at: roundResult.regDate,
      });

      return roundResult.round;
    } catch (error) {
      // Re-throw error to allow retry mechanism to work
      throw error;
    }
  }


  /**
   * Process multiple previous rounds in batch for NAMED_RUNNINGBALL3
   */
  private async processPreviousRoundsBatchRunningball3(
    roundsData: any[],
    currentRoundNumber: number,
    currentRoundStartTime: Date,
    intervalMs: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const TZ_OFFSET = 9;
    const parseRoundNumber = (roundData: any) => parseInt(roundData.date_round) % 1000;

    const isValidResult = (item: any) => {
      return item.ball_1 !== '0' && item.ball_2 !== '0' && item.ball_odd_even;
    };

    const validRounds = roundsData.filter(isValidResult);
    if (validRounds.length === 0) {
      return;
    }

    const batchData = validRounds.map((roundData) => {
      const roundNumber = parseRoundNumber(roundData);
      const roundDiff = currentRoundNumber - roundNumber;
      const roundStartTime = new Date(
        currentRoundStartTime.getTime() - roundDiff * intervalMs,
      );
      const roundEndTime = new Date(roundStartTime.getTime() + intervalMs);
      const roundId = createRoundIdFromStartTime(roundStartTime, roundNumber, TZ_OFFSET);

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_RUNNINGBALL3',
        ball_1: roundData.ball_1,
        ball_2: roundData.ball_2,
        ball_odd_even: roundData.ball_odd_even,
        result_time: roundEndTime,
      };
    });

    await this.runningball3RoundService.upsertRoundsBatch(batchData);

    // Trigger betting result processing for the first round in batch
    if (batchData.length > 0 && batchData[0].round_day) {
      await this.queueService.addBettingResultJob({
        game: 'named_runningball3',
        roundDay: batchData[0].round_day,
      });
    }
  }

  /**
   * Process multiple previous rounds in batch for NAMED_SPACE8
   */
  private async processPreviousRoundsBatchSpace8(
    roundsData: any[],
    currentRoundNumber: number,
    currentRoundStartTime: Date,
    intervalMs: number,
  ): Promise<void> {
    if (roundsData.length === 0) return;

    const TZ_OFFSET = 9;
    const parseRoundNumber = (roundData: any) => parseInt(roundData.date_round) % 1000;

    const isValidResult = (item: any) => {
      const ballsOk =
        item.ball_1 !== '0' &&
        item.ball_2 !== '0' &&
        item.ball_3 !== '0' &&
        item.ball_4 !== '0' &&
        item.ball_5 !== '0' &&
        item.ball_6 !== '0' &&
        item.ball_7 !== '0' &&
        item.ball_8 !== '0';
      const dataOk =
        item.count_win &&
        item.sum_win &&
        item.sum_home_ball_odd_even &&
        item.sum_away_ball_odd_even &&
        item.home_ball1_odd_even &&
        item.away_ball1_odd_even &&
        item.home_ball1_under_over &&
        item.away_ball1_under_over;
      return ballsOk && dataOk;
    };

    const validRounds = roundsData.filter(isValidResult);
    if (validRounds.length === 0) {
      return;
    }

    const batchData = validRounds.map((roundData) => {
      const roundNumber = parseRoundNumber(roundData);
      const roundDiff = currentRoundNumber - roundNumber;
      const roundStartTime = new Date(
        currentRoundStartTime.getTime() - roundDiff * intervalMs,
      );
      const roundEndTime = new Date(roundStartTime.getTime() + intervalMs);
      const roundId = createRoundIdFromStartTime(roundStartTime, roundNumber, TZ_OFFSET);

      // Split balls into HOME and AWAY arrays
      // HOME: first 3 balls, AWAY: last 5 balls (based on socket data structure)
      const homeBalls = [roundData.ball_1, roundData.ball_2, roundData.ball_3].filter(
        Boolean,
      );
      const awayBalls = [
        roundData.ball_4,
        roundData.ball_5,
        roundData.ball_6,
        roundData.ball_7,
        roundData.ball_8,
      ].filter(Boolean);

      return {
        round_day: roundId,
        round_number: roundNumber,
        game_name: 'NAMED_SPACE8',
        count_win: roundData.count_win,
        sum_win: roundData.sum_win,
        sum_home_ball_odd_even: roundData.sum_home_ball_odd_even,
        sum_away_ball_odd_even: roundData.sum_away_ball_odd_even,
        home_ball1_odd_even: roundData.home_ball1_odd_even,
        away_ball1_odd_even: roundData.away_ball1_odd_even,
        home_ball1_under_over: roundData.home_ball1_under_over,
        away_ball1_under_over: roundData.away_ball1_under_over,
        home_balls: JSON.stringify(homeBalls),
        away_balls: JSON.stringify(awayBalls),
        result_time: roundEndTime,
      };
    });

    await this.space8RoundService.upsertRoundsBatch(batchData);

    // Trigger betting result processing for the first round in batch
    if (batchData.length > 0 && batchData[0].round_day) {
      await this.queueService.addBettingResultJob({
        game: 'named_space8',
        roundDay: batchData[0].round_day,
      });
    }
  }
}
