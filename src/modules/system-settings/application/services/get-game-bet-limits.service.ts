import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service';
import { ISystemSettingRepository } from '../../infrastructure/persistence/repositories/system-setting.repository';
import { notFound, MessageKeys } from '../../../../shared/exceptions/exception-helpers';
import type { GameBetLimitsValue } from './game-bet-limits.validator';

const GAME_BET_LIMITS_KEY = 'game_bet_limits';
const CACHE_KEY_PREFIX = 'system_settings:';

@Injectable()
export class GetGameBetLimitsService {
  constructor(
    private readonly redisService: RedisService,
    @Inject('ISystemSettingRepository')
    private readonly systemSettingRepository: ISystemSettingRepository,
  ) {}

  /**
   * Get game_bet_limits: read from cache first, fallback to database.
   */
  async get(): Promise<GameBetLimitsValue> {
    const cacheKey = `${CACHE_KEY_PREFIX}${GAME_BET_LIMITS_KEY}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached != null && typeof cached === 'object' && !Array.isArray(cached)) {
      return this.normalize(cached as Record<string, unknown>);
    }

    const setting = await this.systemSettingRepository.findByKey(GAME_BET_LIMITS_KEY);
    if (!setting?.value || typeof setting.value !== 'object' || Array.isArray(setting.value)) {
      throw notFound(MessageKeys.SYSTEM_SETTING_NOT_FOUND);
    }
    const value = this.normalize(setting.value as Record<string, unknown>);
    await this.redisService.set(cacheKey, value);
    return value;
  }

  private normalize(raw: Record<string, unknown>): GameBetLimitsValue {
    const result: GameBetLimitsValue = {};
    for (const key of Object.keys(raw)) {
      const v = raw[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        const minBet = Number(o.minBet);
        const maxBet = Number(o.maxBet);
        const maxPayoutAmount = Number(o.maxPayoutAmount);
        if (!Number.isNaN(minBet) && !Number.isNaN(maxBet) && !Number.isNaN(maxPayoutAmount)) {
          result[key] = { minBet, maxBet, maxPayoutAmount };
        }
      }
    }
    return result;
  }
}
