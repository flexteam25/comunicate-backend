import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../../../../shared/redis/redis.service';
import { ISystemSettingRepository } from '../../infrastructure/persistence/repositories/system-setting.repository';

const MAINTENANCE_KEY = 'maintenance';
const CACHE_KEY_PREFIX = 'system_settings:';

export interface MaintenanceValue {
  status: number;
}

@Injectable()
export class MaintenanceCheckService {
  constructor(
    private readonly redisService: RedisService,
    @Inject('ISystemSettingRepository')
    private readonly systemSettingRepository: ISystemSettingRepository,
  ) {}

  async getMaintenance(): Promise<MaintenanceValue> {
    const cacheKey = `${CACHE_KEY_PREFIX}${MAINTENANCE_KEY}`;
    const cached = (await this.redisService.get(cacheKey)) as MaintenanceValue | null;
    if (cached != null && typeof cached === 'object' && 'status' in cached) {
      return this.normalizeMaintenance(cached);
    }

    const setting = await this.systemSettingRepository.findByKey(MAINTENANCE_KEY);
    const value = (setting?.value as unknown as MaintenanceValue | undefined) ?? {
      status: 0,
    };
    const normalized = this.normalizeMaintenance(value);
    await this.redisService.set(cacheKey, normalized);
    return normalized;
  }

  private normalizeMaintenance(v: MaintenanceValue): MaintenanceValue {
    return {
      status: typeof v.status === 'number' ? v.status : 0,
    };
  }
}
