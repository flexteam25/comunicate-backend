import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  PointExchange,
  PointExchangeStatus,
} from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { CurrentAdminPayload } from '../../../../admin/infrastructure/decorators/current-admin.decorator';

export interface ApproveExchangeCommand {
  exchangeId: string;
  adminId: string;
}

@Injectable()
export class ApproveExchangeUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
  ) {}

  async execute(command: ApproveExchangeCommand): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId);

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (
      exchange.status !== PointExchangeStatus.PENDING &&
      exchange.status !== PointExchangeStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Only pending or processing exchanges can be approved',
      );
    }

    await this.pointExchangeRepository.update(command.exchangeId, {
      status: PointExchangeStatus.COMPLETED,
      adminId: command.adminId,
      processedAt: new Date(),
    });

    // Reload with relationships for response
    const updatedExchange = await this.pointExchangeRepository.findById(
      command.exchangeId,
      ['user', 'site', 'admin'],
    );

    if (!updatedExchange) {
      throw new NotFoundException('Exchange not found after update');
    }

    return updatedExchange;
  }
}
