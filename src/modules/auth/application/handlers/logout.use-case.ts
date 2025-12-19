import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { UserToken } from '../../domain/entities/user-token.entity';

export interface LogoutCommand {
  tokenId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    // Check if token exists (outside transaction for validation)
    const token = await this.userTokenRepository.findByTokenId(command.tokenId);
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

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
  }
}
