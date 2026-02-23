import { Injectable, Inject } from '@nestjs/common';
import { ISystemSettingRepository } from '../../infrastructure/persistence/repositories/system-setting.repository';
import { SystemSetting } from '../../domain/entities/system-setting.entity';

@Injectable()
export class GetAllSystemSettingsUseCase {
  constructor(
    @Inject('ISystemSettingRepository')
    private readonly systemSettingRepository: ISystemSettingRepository,
  ) {}

  async execute(): Promise<SystemSetting[]> {
    return this.systemSettingRepository.findAll();
  }
}
