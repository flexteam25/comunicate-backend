import { Injectable, Inject } from '@nestjs/common';
import { IPointSettingRepository } from '../../../infrastructure/persistence/repositories/point-setting.repository';
import { PointSetting } from '../../../domain/entities/point-setting.entity';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface UpdatePointSettingCommand {
  id: string;
  point?: number;
  name?: string;
  nameKo?: string;
}

@Injectable()
export class UpdatePointSettingUseCase {
  constructor(
    @Inject('IPointSettingRepository')
    private readonly pointSettingRepository: IPointSettingRepository,
  ) {}

  async execute(command: UpdatePointSettingCommand): Promise<PointSetting> {
    const updateData: Partial<PointSetting> = {};

    if (command.point !== undefined) {
      if (!Number.isInteger(command.point)) {
        throw badRequest(MessageKeys.POINTS_MUST_BE_INTEGER);
      }
      updateData.point = command.point;
    }

    if (command.name !== undefined) {
      updateData.name = command.name;
    }

    if (command.nameKo !== undefined) {
      updateData.nameKo = command.nameKo;
    }

    return this.pointSettingRepository.update(command.id, updateData);
  }
}
