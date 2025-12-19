import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
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

export interface ResetPasswordCommand {
  email: string;
  newPassword: string;
  passwordConfirmation: string;
  verifyCode: string;
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
      throw new BadRequestException('Password confirmation does not match');
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify OTP from Redis
    const redisKey = `otp:forgot-password:${user.id}`;
    const storedOtp = await this.redisService.getString(redisKey);

    if (!storedOtp) {
      throw new UnauthorizedException('OTP has expired or is invalid');
    }

    if (storedOtp !== command.verifyCode) {
      throw new UnauthorizedException('Invalid OTP code');
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

    // Delete OTP from Redis after successful password reset
    await this.redisService.delete(redisKey);

    return {
      message: 'Password reset successfully. Please login with your new password.',
    };
  }
}
