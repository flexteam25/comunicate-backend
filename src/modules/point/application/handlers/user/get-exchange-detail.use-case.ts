import { Injectable, Inject } from '@nestjs/common';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import {
  notFound,
  unauthorized,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface GetExchangeDetailCommand {
  userId: string;
  exchangeId: string;
}

@Injectable()
export class GetExchangeDetailUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
  ) {}

  async execute(command: GetExchangeDetailCommand): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId, [
      'site',
    ]);

    if (!exchange) {
      throw notFound(MessageKeys.EXCHANGE_NOT_FOUND);
    }

    if (exchange.userId !== command.userId) {
      throw unauthorized(MessageKeys.NOT_AUTHORIZED_TO_VIEW_EXCHANGE);
    }

    return exchange;
  }
}
