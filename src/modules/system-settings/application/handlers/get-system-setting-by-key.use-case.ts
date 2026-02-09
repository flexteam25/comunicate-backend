import { Injectable, Inject } from '@nestjs/common';
import { ISystemSettingRepository } from '../../infrastructure/persistence/repositories/system-setting.repository';
import { SystemSetting } from '../../domain/entities/system-setting.entity';
import { notFound, MessageKeys } from '../../../../shared/exceptions/exception-helpers';

export interface GetSystemSettingByKeyCommand {
  key: string;
}

@Injectable()
export class GetSystemSettingByKeyUseCase {
  constructor(
    @Inject('ISystemSettingRepository')
    private readonly systemSettingRepository: ISystemSettingRepository,
  ) {}

  async execute(command: GetSystemSettingByKeyCommand): Promise<SystemSetting> {
    const setting = await this.systemSettingRepository.findByKey(command.key);
    if (!setting) {
      throw notFound(MessageKeys.SYSTEM_SETTING_NOT_FOUND);
    }
    return setting;
  }
}
