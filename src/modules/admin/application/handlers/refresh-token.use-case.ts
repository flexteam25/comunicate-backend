import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { IAdminTokenRepository } from '../../infrastructure/persistence/repositories/admin-token.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { JwtService, TokenPair } from '../../../../shared/services/jwt.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { AdminToken } from '../../domain/entities/admin-token.entity';
import { Admin } from '../../domain/entities/admin.entity';
import { unauthorized } from '../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';

export interface RefreshTokenCommand {
  refreshToken: string;
}

export interface RefreshTokenResult {
  admin: Admin;
  tokens: TokenPair;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    // Verify refresh token (outside transaction)
    let payload;
    try {
      payload = this.jwtService.verifyRefreshToken(command.refreshToken);
    } catch {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Find token record (outside transaction for validation)
    const tokenRecord = await this.adminTokenRepository.findByTokenId(payload.jti);
    if (!tokenRecord) {
      throw unauthorized(MessageKeys.TOKEN_NOT_FOUND);
    }

    // Check if token is valid
    if (!tokenRecord.isValid()) {
      throw unauthorized(MessageKeys.TOKEN_REVOKED_OR_EXPIRED);
    }

    // Verify refresh token hash (outside transaction)
    const isValidToken = await this.passwordService.verifyRefreshToken(
      command.refreshToken,
      tokenRecord.refreshTokenHash,
    );
    if (!isValidToken) {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Find admin (outside transaction for validation)
    const admin = await this.adminRepository.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw unauthorized(MessageKeys.ADMIN_NOT_FOUND);
    }

    // Generate new token pair (outside transaction)
    const tokens = this.jwtService.generateTokenPair(admin.id, admin.email);

    // Hash new refresh token (outside transaction)
    const refreshTokenHash = await this.passwordService.hashRefreshToken(
      tokens.refreshToken,
    );

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Revoke old token
        await entityManager.update(
          AdminToken,
          { tokenId: payload.jti },
          { revokedAt: new Date() },
        );

        // Create new token record
        const newTokenRecord = new AdminToken();
        newTokenRecord.adminId = admin.id;
        newTokenRecord.tokenId = tokens.tokenId;
        newTokenRecord.refreshTokenHash = refreshTokenHash;
        newTokenRecord.deviceInfo = tokenRecord.deviceInfo;
        newTokenRecord.ipAddress = tokenRecord.ipAddress;
        newTokenRecord.expiresAt = expiresAt;

        await entityManager.save(AdminToken, newTokenRecord);

        return {
          admin,
          tokens,
        };
      },
    );
  }
}
