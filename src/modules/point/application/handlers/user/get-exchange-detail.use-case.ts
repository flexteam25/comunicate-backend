import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';

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
    const exchange = await this.pointExchangeRepository.findById(
      command.exchangeId,
      ['site'],
    );

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.userId !== command.userId) {
      throw new UnauthorizedException(
        'Not authorized to view this exchange',
      );
    }

    return exchange;
  }
}
