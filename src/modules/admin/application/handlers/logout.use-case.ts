import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminTokenRepository } from '../../infrastructure/persistence/repositories/admin-token.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { AdminToken } from '../../domain/entities/admin-token.entity';
import { unauthorized } from '../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';

export interface LogoutCommand {
  tokenId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    // Check if token exists (outside transaction for validation)
    const token = await this.adminTokenRepository.findByTokenId(command.tokenId);
    if (!token) {
      throw unauthorized(MessageKeys.TOKEN_NOT_FOUND);
    }

    // Revoke the token in transaction
    await this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        await entityManager.update(
          AdminToken,
          { tokenId: command.tokenId },
          { revokedAt: new Date() },
        );
      },
    );
  }
}
