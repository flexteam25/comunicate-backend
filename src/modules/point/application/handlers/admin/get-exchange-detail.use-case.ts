import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';

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
      'site',
      'admin',
      'manager',
    ]);

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    return exchange;
  }
}
