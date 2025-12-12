import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { IAdminTokenRepository } from '../../infrastructure/persistence/repositories/admin-token.repository';
import { IAdminOldPasswordRepository } from '../../infrastructure/persistence/repositories/admin-old-password.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminOldPassword, AdminOldPasswordType } from '../../../user/domain/entities/admin-old-password.entity';
import { AdminToken } from '../../domain/entities/admin-token.entity';

export interface ChangePasswordCommand {
  adminId: string;
  tokenId: string;
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
  logoutAll?: boolean;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    @Inject('IAdminOldPasswordRepository')
    private readonly adminOldPasswordRepository: IAdminOldPasswordRepository,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<Admin> {
    // Validate password confirmation (outside transaction)
    if (command.newPassword !== command.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    // Find admin (outside transaction for validation)
    const admin = await this.adminRepository.findById(command.adminId);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Verify current password (outside transaction)
    const isValidPassword = await this.passwordService.verifyPassword(
      command.currentPassword,
      admin.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password (outside transaction)
    const newPasswordHash = await this.passwordService.hashPassword(command.newPassword);

    // Get all tokens if logoutAll is needed (outside transaction)
    let allTokens: AdminToken[] = [];
    if (command.logoutAll) {
      allTokens = await this.adminTokenRepository.findByAdminId(command.adminId);
    }

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(async (entityManager: EntityManager) => {
      // Save old password before changing
      const oldPassword = new AdminOldPassword();
      oldPassword.adminId = admin.id;
      oldPassword.passwordHash = admin.passwordHash;
      oldPassword.type = AdminOldPasswordType.CHANGE;
      await entityManager.save(AdminOldPassword, oldPassword);

      // Update admin password
      admin.passwordHash = newPasswordHash;
      const updatedAdmin = await entityManager.save(Admin, admin);

      // If logoutAll is true, revoke all other tokens except the current one
      if (command.logoutAll) {
        for (const token of allTokens) {
          // Skip the current token
          if (token.tokenId !== command.tokenId) {
            await entityManager.update(
              AdminToken,
              { tokenId: token.tokenId },
              { revokedAt: new Date() },
            );
          }
        }
      }

      return updatedAdmin;
    });
  }
}

