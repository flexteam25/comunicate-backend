import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { User } from '../../../domain/entities/user.entity';
import { UserToken } from '../../../../auth/domain/entities/user-token.entity';
import { notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface DeleteUserCommand {
  userId: string;
  adminId: string;
}

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Soft delete user by UUID:
   * - Mark user as inactive (isActive = false)
   * - Set deletedAt timestamp
   * - Revoke all active user tokens
   */
  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw notFound(MessageKeys.USER_NOT_FOUND);
    }

    await this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Mark user as inactive and soft delete
        user.isActive = false;
        (user as any).deletedAt = new Date();
        await entityManager.save(User, user);

        // Revoke all active tokens for this user
        await entityManager.update(
          UserToken,
          { userId: command.userId, revokedAt: null },
          { revokedAt: new Date() },
        );
      },
    );
  }
}
