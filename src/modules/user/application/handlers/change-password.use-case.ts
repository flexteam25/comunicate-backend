import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import { IUserTokenRepository } from '../../../auth/infrastructure/persistence/repositories/user-token.repository';
import { IUserOldPasswordRepository } from '../../infrastructure/persistence/repositories/user-old-password.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { User } from '../../domain/entities/user.entity';
import {
  UserOldPassword,
  UserOldPasswordType,
} from '../../domain/entities/user-old-password.entity';
import { UserToken } from '../../../auth/domain/entities/user-token.entity';
import {
  unauthorized,
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface ChangePasswordCommand {
  userId: string;
  tokenId: string;
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
  logoutAll?: boolean;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    @Inject('IUserOldPasswordRepository')
    private readonly userOldPasswordRepository: IUserOldPasswordRepository,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<User> {
    // Validate password confirmation (outside transaction)
    if (command.newPassword !== command.passwordConfirmation) {
      throw badRequest(MessageKeys.PASSWORD_CONFIRMATION_MISMATCH);
    }

    // Find user (outside transaction for validation)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user) {
      throw unauthorized(MessageKeys.USER_NOT_FOUND);
    }

    // Verify current password (outside transaction)
    const isValidPassword = await this.passwordService.verifyPassword(
      command.currentPassword,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw unauthorized(MessageKeys.CURRENT_PASSWORD_INCORRECT);
    }

    // Hash new password (outside transaction)
    const newPasswordHash = await this.passwordService.hashPassword(command.newPassword);

    // Get all tokens if logoutAll is needed (outside transaction)
    let allTokens: UserToken[] = [];
    if (command.logoutAll) {
      allTokens = await this.userTokenRepository.findByUserId(command.userId);
    }

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Save old password before changing
        const oldPassword = new UserOldPassword();
        oldPassword.userId = user.id;
        oldPassword.passwordHash = user.passwordHash;
        oldPassword.type = UserOldPasswordType.CHANGE;
        await entityManager.save(UserOldPassword, oldPassword);

        // Update user password
        user.passwordHash = newPasswordHash;
        const updatedUser = await entityManager.save(User, user);

        // If logoutAll is true, revoke all other tokens except the current one
        if (command.logoutAll) {
          for (const token of allTokens) {
            // Skip the current token
            if (token.tokenId !== command.tokenId) {
              await entityManager.update(
                UserToken,
                { tokenId: token.tokenId },
                { revokedAt: new Date() },
              );
            }
          }
        }

        return updatedUser;
      },
    );
  }
}
