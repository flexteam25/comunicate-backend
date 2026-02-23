import { SystemSetting } from '../../../domain/entities/system-setting.entity';

export interface ISystemSettingRepository {
  findAll(): Promise<SystemSetting[]>;
  findByKey(key: string): Promise<SystemSetting | null>;
  updateValue(key: string, value: Record<string, unknown> | null): Promise<SystemSetting>;
}
