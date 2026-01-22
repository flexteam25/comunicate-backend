import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PointSetting } from '../../../domain/entities/point-setting.entity';
import { IPointSettingRepository } from '../repositories/point-setting.repository';
import {
  notFound,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

@Injectable()
export class PointSettingRepository implements IPointSettingRepository {
  constructor(
    @InjectRepository(PointSetting)
    private readonly repository: Repository<PointSetting>,
  ) {}

  async findAll(): Promise<PointSetting[]> {
    return this.repository.find({
      where: { deletedAt: null },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<PointSetting | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
    });
  }

  async findByKey(key: string): Promise<PointSetting | null> {
    return this.repository.findOne({
      where: { key, deletedAt: null },
    });
  }

  async update(id: string, data: Partial<PointSetting>): Promise<PointSetting> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw notFound(MessageKeys.NOT_FOUND);
    }
    return updated;
  }
}
