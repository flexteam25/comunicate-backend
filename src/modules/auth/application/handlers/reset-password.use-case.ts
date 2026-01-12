import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { IUserTokenRepository } from '../../infrastructure/persistence/repositories/user-token.repository';
import { RedisService } from '../../../../shared/redis/redis.service';
import { PasswordService } from '../../../../shared/services/password.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { User } from '../../../user/domain/entities/user.entity';
import {
  UserOldPassword,
  UserOldPasswordType,
} from '../../../user/domain/entities/user-old-password.entity';
import { UserToken } from '../../domain/entities/user-token.entity';
import {
  badRequest,
  unauthorized,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
  passwordConfirmation: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
    private readonly redisService: RedisService,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<{ message: string }> {
    // Validate password confirmation
    if (command.newPassword !== command.passwordConfirmation) {
      throw badRequest(MessageKeys.PASSWORD_CONFIRMATION_MISMATCH);
    }

    // Verify token from Redis
    const tokenKey = `token:forgot-password:${command.token}`;
    const tokenValue = await this.redisService.getString(tokenKey);

    if (!tokenValue) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Parse token value to get userId
    let tokenData: { userId: string; email: string };
    try {
      tokenData = JSON.parse(tokenValue);
    } catch (error) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    if (!tokenData.userId) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Find user by userId
    const user = await this.userRepository.findById(tokenData.userId);
    if (!user) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    if (!user.isActive) {
      throw unauthorized(MessageKeys.USER_ACCOUNT_INACTIVE);
    }

    // Hash new password (outside transaction)
    const newPasswordHash = await this.passwordService.hashPassword(command.newPassword);

    // Get all user tokens (outside transaction)
    const allTokens = await this.userTokenRepository.findByUserId(user.id);

    // Execute database operations in transaction
    await this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Save old password with type 'forgot'
        const oldPassword = new UserOldPassword();
        oldPassword.userId = user.id;
        oldPassword.passwordHash = user.passwordHash;
        oldPassword.type = UserOldPasswordType.FORGOT;
        await entityManager.save(UserOldPassword, oldPassword);

        // Update user password
        user.passwordHash = newPasswordHash;
        await entityManager.save(User, user);

        // Revoke all user tokens
        for (const token of allTokens) {
          await entityManager.update(
            UserToken,
            { tokenId: token.tokenId },
            { revokedAt: new Date() },
          );
        }
      },
    );

    // Delete token from Redis after successful password reset
    await this.redisService.delete(tokenKey);

    return {
      message: 'Password reset successfully. Please login with your new password.',
    };
  }
}
