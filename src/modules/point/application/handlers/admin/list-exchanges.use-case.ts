import { Injectable, Inject } from '@nestjs/common';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';

export interface ListExchangesCommand {
  status?: string;
  siteId?: string;
  userName?: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
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
        userName: command.userName,
        startDate: command.startDate,
        endDate: command.endDate,
      },
      command.cursor,
      command.limit || 20,
    );
  }
}
