import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { UserToken } from '../../domain/entities/user-token.entity';
import { GameBackendClientService } from '../../../../shared/services/game-backend-client.service';
import {
  unauthorized,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';
import { LoggerService } from '../../../../shared/logger/logger.service';

export interface LogoutCommand {
  tokenId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly transactionService: TransactionService,
    private readonly gameBackendClient: GameBackendClientService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    // Check if token exists (outside transaction for validation)
    const token = await this.userTokenRepository.findByTokenId(command.tokenId);
    if (!token) {
      throw unauthorized(MessageKeys.TOKEN_NOT_FOUND);
    }

    const userId = token.userId;

    // Revoke the token in transaction
    await this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        await entityManager.update(
          UserToken,
          { tokenId: command.tokenId },
          { revokedAt: new Date() },
        );
      },
    );

    // Notify game backend to revoke user session (fire-and-forget)
    setImmediate(() => {
      this.gameBackendClient.revokeUser(userId).catch((err) => {
        this.logger.error('Failed to revoke user session', { error: err instanceof Error ? err.message : String(err) }, 'auth');
        // Ignore errors; logout already succeeded
      });
    });
  }
}
