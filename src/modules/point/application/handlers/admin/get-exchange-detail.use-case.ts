import { Injectable, Inject } from '@nestjs/common';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface GetExchangeDetailCommand {
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
      'user',
      'user.userProfile',
      'site',
      'admin',
      'manager',
    ]);

    if (!exchange) {
      throw notFound(MessageKeys.EXCHANGE_NOT_FOUND);
    }

    return exchange;
  }
}
