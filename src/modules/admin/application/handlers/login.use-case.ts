import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { IAdminTokenRepository } from '../../infrastructure/persistence/repositories/admin-token.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { JwtService, TokenPair } from '../../../../shared/services/jwt.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { AdminToken } from '../../domain/entities/admin-token.entity';
import { Admin } from '../../domain/entities/admin.entity';
import {
  badRequest,
  MessageKeys,
} from '../../../../shared/exceptions/exception-helpers';

export interface LoginCommand {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface LoginResult {
  admin: Admin;
  tokens: TokenPair;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    // Find admin (outside transaction for validation)
    const admin = await this.adminRepository.findByEmail(command.email);
    if (!admin) {
      throw badRequest(MessageKeys.INVALID_CREDENTIALS);
    }

    if (!admin.isActive) {
      throw badRequest(MessageKeys.ADMIN_ACCOUNT_INACTIVE);
    }

    // Verify password (outside transaction)
    const isValidPassword = await this.passwordService.verifyPassword(
      command.password,
      admin.passwordHash,
    );
    if (!isValidPassword) {
      throw badRequest(MessageKeys.INVALID_CREDENTIALS);
    }

    // Generate token pair (outside transaction)
    const tokens = this.jwtService.generateTokenPair(admin.id, admin.email);

    // Hash refresh token for storage (outside transaction)
    const refreshTokenHash = await this.passwordService.hashRefreshToken(
      tokens.refreshToken,
    );

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Create token record
        const adminToken = new AdminToken();
        adminToken.adminId = admin.id;
        adminToken.tokenId = tokens.tokenId;
        adminToken.refreshTokenHash = refreshTokenHash;
        adminToken.deviceInfo = command.deviceInfo || null;
        adminToken.ipAddress = command.ipAddress || null;
        adminToken.expiresAt = expiresAt;

        await entityManager.save(AdminToken, adminToken);

        // Update last login
        admin.lastLoginAt = new Date();
        await entityManager.save(Admin, admin);

        return {
          admin,
          tokens,
        };
      },
    );
  }
}
