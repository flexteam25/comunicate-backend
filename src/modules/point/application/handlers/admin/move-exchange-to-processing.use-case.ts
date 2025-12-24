import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PointExchange, PointExchangeStatus } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';

export interface MoveExchangeToProcessingCommand {
  exchangeId: string;
  adminId: string;
}

@Injectable()
export class MoveExchangeToProcessingUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
  ) {}

  async execute(
    command: MoveExchangeToProcessingCommand,
  ): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(
      command.exchangeId,
    );

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.status !== PointExchangeStatus.PENDING) {
      throw new BadRequestException(
        'Only pending exchanges can be moved to processing',
      );
    }

    await this.pointExchangeRepository.update(command.exchangeId, {
      status: PointExchangeStatus.PROCESSING,
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
