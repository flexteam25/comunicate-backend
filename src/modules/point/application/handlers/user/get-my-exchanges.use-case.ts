import { Injectable, Inject } from '@nestjs/common';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';

export interface GetMyExchangesCommand {
  userId: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class GetMyExchangesUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
  ) {}

  async execute(
    command: GetMyExchangesCommand,
  ): Promise<CursorPaginationResult<PointExchange>> {
    return this.pointExchangeRepository.findByUserIdWithCursor(
      command.userId,
      command.status ? { status: command.status } : undefined,
      command.cursor,
      command.limit || 20,
    );
  }
}
