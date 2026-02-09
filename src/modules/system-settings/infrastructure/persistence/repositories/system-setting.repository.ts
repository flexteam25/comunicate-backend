import { SystemSetting } from '../../../domain/entities/system-setting.entity';

export interface ISystemSettingRepository {
  findByKey(key: string): Promise<SystemSetting | null>;
  updateValue(key: string, value: Record<string, unknown> | null): Promise<SystemSetting>;
}
