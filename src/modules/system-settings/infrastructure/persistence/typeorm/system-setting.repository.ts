import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../../domain/entities/system-setting.entity';
import { ISystemSettingRepository } from '../repositories/system-setting.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class SystemSettingRepository implements ISystemSettingRepository {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repository: Repository<SystemSetting>,
  ) {}

  async findAll(): Promise<SystemSetting[]> {
    return this.repository.find({ order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<SystemSetting | null> {
    return this.repository.findOne({ where: { key } });
  }

  async updateValue(
    key: string,
    value: Record<string, unknown> | null,
  ): Promise<SystemSetting> {
    const setting = await this.findByKey(key);
    if (!setting) {
      throw notFound(MessageKeys.SYSTEM_SETTING_NOT_FOUND);
    }
    setting.value = value;
    return this.repository.save(setting);
  }
}
