import { PointSetting } from '../../../domain/entities/point-setting.entity';

export interface IPointSettingRepository {
  findAll(): Promise<PointSetting[]>;
  findById(id: string): Promise<PointSetting | null>;
  findByKey(key: string): Promise<PointSetting | null>;
  update(id: string, data: Partial<PointSetting>): Promise<PointSetting>;
}
