import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { GameBackendClientService } from '../../../../../shared/services/game-backend-client.service';
import { ISystemSettingRepository } from '../../../infrastructure/persistence/repositories/system-setting.repository';
import { SystemSetting } from '../../../domain/entities/system-setting.entity';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import {
  validateAndMergeGameBetLimits,
  GameBetLimitsValue,
} from '../../../application/services/game-bet-limits.validator';

const CACHE_KEY_PREFIX = 'system_settings:';

export const SystemSettingKeys = {
  MAINTENANCE: 'maintenance',
  GAME_BET_LIMITS: 'game_bet_limits',
} as const;

export type SystemSettingKey = (typeof SystemSettingKeys)[keyof typeof SystemSettingKeys];

export interface UpdateSystemSettingValueCommand {
  key: string;
  value: Record<string, unknown> | null;
}

@Injectable()
export class UpdateSystemSettingValueUseCase {
  constructor(
    @Inject('ISystemSettingRepository')
    private readonly systemSettingRepository: ISystemSettingRepository,
    private readonly redisService: RedisService,
    private readonly gameBackendClient: GameBackendClientService,
  ) {}

  async execute(command: UpdateSystemSettingValueCommand): Promise<SystemSetting> {
    const existing = await this.systemSettingRepository.findByKey(command.key);
    if (!existing) {
      throw notFound(MessageKeys.SYSTEM_SETTING_NOT_FOUND);
    }

    let currentValueFromDb = existing.value;
    if (command.key === SystemSettingKeys.GAME_BET_LIMITS) {
      const fresh = await this.systemSettingRepository.findByKey(command.key);
      currentValueFromDb = fresh?.value ?? existing.value;
    }

    const valueToSave = this.resolveValueToSave(
      command.key,
      currentValueFromDb,
      command.value,
    );

    const updated = await this.systemSettingRepository.updateValue(
      command.key,
      valueToSave,
    );

    const cacheKey = `${CACHE_KEY_PREFIX}${command.key}`;
    await this.redisService.set(cacheKey, valueToSave);

    if (command.key === SystemSettingKeys.GAME_BET_LIMITS) {
      void this.gameBackendClient
        .notifyBetLimitsChanged(valueToSave)
        .catch((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : JSON.stringify(err);
          console.error('Failed to notify game backend of bet limits change', {
            error: message,
          });
        });
    }

    return updated;
  }

  private resolveValueToSave(
    key: string,
    currentValue: Record<string, unknown> | null,
    incomingValue: Record<string, unknown> | null,
  ): Record<string, unknown> {
    switch (key) {
      case SystemSettingKeys.MAINTENANCE: {
        if (
          incomingValue == null ||
          typeof incomingValue !== 'object' ||
          Array.isArray(incomingValue)
        ) {
          throw badRequest(MessageKeys.VALIDATION_FAILED);
        }
        return incomingValue;
      }
      case SystemSettingKeys.GAME_BET_LIMITS: {
        if (
          currentValue == null ||
          typeof currentValue !== 'object' ||
          Array.isArray(currentValue)
        ) {
          throw notFound(MessageKeys.SYSTEM_SETTING_NOT_FOUND);
        }
        const current = JSON.parse(JSON.stringify(currentValue)) as GameBetLimitsValue;
        if (
          incomingValue == null ||
          typeof incomingValue !== 'object' ||
          Array.isArray(incomingValue)
        ) {
          return current;
        }
        return validateAndMergeGameBetLimits(current, incomingValue);
      }
      default:
        throw badRequest(MessageKeys.VALIDATION_FAILED);
    }
  }
}
