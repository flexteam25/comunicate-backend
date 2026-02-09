import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { ISystemSettingRepository } from '../../../infrastructure/persistence/repositories/system-setting.repository';
import { SystemSetting } from '../../../domain/entities/system-setting.entity';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

const CACHE_KEY_PREFIX = 'system_settings:';

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
  ) {}

  async execute(command: UpdateSystemSettingValueCommand): Promise<SystemSetting> {
    const existing = await this.systemSettingRepository.findByKey(command.key);
    if (!existing) {
      throw notFound(MessageKeys.SYSTEM_SETTING_NOT_FOUND);
    }

    const updated = await this.systemSettingRepository.updateValue(
      command.key,
      command.value,
    );

    const cacheKey = `${CACHE_KEY_PREFIX}${command.key}`;
    await this.redisService.set(cacheKey, command.value);

    return updated;
  }
}
