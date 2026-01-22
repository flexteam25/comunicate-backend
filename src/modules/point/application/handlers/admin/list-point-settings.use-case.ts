import { Injectable, Inject } from '@nestjs/common';
import { IPointSettingRepository } from '../../../infrastructure/persistence/repositories/point-setting.repository';
import { PointSetting } from '../../../domain/entities/point-setting.entity';

@Injectable()
export class ListPointSettingsUseCase {
  constructor(
    @Inject('IPointSettingRepository')
    private readonly pointSettingRepository: IPointSettingRepository,
  ) {}

  async execute(): Promise<PointSetting[]> {
    return this.pointSettingRepository.findAll();
  }
}
