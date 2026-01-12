import {
  Injectable,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { IAdminTokenRepository } from '../../infrastructure/persistence/repositories/admin-token.repository';
import { IAdminOldPasswordRepository } from '../../infrastructure/persistence/repositories/admin-old-password.repository';
import { RedisService } from '../../../../shared/redis/redis.service';
import { PasswordService } from '../../../../shared/services/password.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { Admin } from '../../domain/entities/admin.entity';
import {
  AdminOldPassword,
  AdminOldPasswordType,
} from '../../../user/domain/entities/admin-old-password.entity';
import { AdminToken } from '../../domain/entities/admin-token.entity';
import { badRequest, unauthorized } from '../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
  passwordConfirmation: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    @Inject('IAdminOldPasswordRepository')
    private readonly adminOldPasswordRepository: IAdminOldPasswordRepository,
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
    const tokenKey = `token:forgot-password:admin:${command.token}`;
    const tokenValue = await this.redisService.getString(tokenKey);

    if (!tokenValue) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Parse token value to get adminId
    let tokenData: { adminId: string; email: string };
    try {
      tokenData = JSON.parse(tokenValue);
    } catch (error) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    if (!tokenData.adminId) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Find admin by adminId
    const admin = await this.adminRepository.findById(tokenData.adminId);
    if (!admin) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    if (!admin.isActive) {
      throw unauthorized(MessageKeys.ADMIN_ACCOUNT_INACTIVE);
    }

    // Hash new password (outside transaction)
    const newPasswordHash = await this.passwordService.hashPassword(command.newPassword);

    // Get all admin tokens (outside transaction)
    const allTokens = await this.adminTokenRepository.findByAdminId(admin.id);

    // Execute database operations in transaction
    await this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Save old password with type 'forgot'
        const oldPassword = new AdminOldPassword();
        oldPassword.adminId = admin.id;
        oldPassword.passwordHash = admin.passwordHash;
        oldPassword.type = AdminOldPasswordType.FORGOT;
        await entityManager.save(AdminOldPassword, oldPassword);

        // Update admin password
        admin.passwordHash = newPasswordHash;
        await entityManager.save(Admin, admin);

        // Revoke all admin tokens
        for (const token of allTokens) {
          await entityManager.update(
            AdminToken,
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
