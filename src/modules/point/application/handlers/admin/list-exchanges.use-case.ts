import { Injectable, Inject } from '@nestjs/common';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';

export interface ListExchangesCommand {
  status?: string;
  siteId?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
  userName?: string;
}

@Injectable()
export class ListExchangesUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
  ) {}

  async execute(
    command: ListExchangesCommand,
  ): Promise<CursorPaginationResult<PointExchange>> {
    return this.pointExchangeRepository.findAllWithCursor(
      {
        status: command.status,
        siteId: command.siteId,
        userId: command.userId,
      },
      command.cursor,
      command.limit || 20,
    );
  }
}
