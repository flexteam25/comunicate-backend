import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService, JwtPayload } from '../../../../shared/services/jwt.service';
import { IAdminTokenRepository } from '../persistence/repositories/admin-token.repository';
import { IAdminRepository } from '../persistence/repositories/admin.repository';
import { unauthorized } from '../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';

interface RequestWithAdmin {
  headers: { authorization?: string };
  ip?: string;
  url: string;
  admin?: {
    adminId: string;
    email: string;
    tokenId: string;
    isSuperAdmin: boolean;
  };
}

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('IAdminTokenRepository')
    private readonly adminTokenRepository: IAdminTokenRepository,
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw unauthorized(MessageKeys.MISSING_OR_INVALID_AUTH_HEADER);
    }

    const token = authHeader.substring(7);

    // Verify token signature and expiration
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verifyAccessToken(token);
    } catch {
      throw unauthorized(MessageKeys.TOKEN_INVALID);
    }

    // Check if token is revoked in database
    const tokenRecord = await this.adminTokenRepository.findByTokenId(payload.jti);
    if (!tokenRecord) {
      throw unauthorized(MessageKeys.TOKEN_NOT_FOUND);
    }
    if (!tokenRecord.isValid()) {
      throw unauthorized(MessageKeys.TOKEN_REVOKED_OR_EXPIRED);
    }

    // Get admin info to check isSuperAdmin
    const admin = await this.adminRepository.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw unauthorized(MessageKeys.ADMIN_NOT_FOUND);
    }

    // Attach admin info to request
    request.admin = {
      adminId: payload.sub,
      email: payload.email,
      tokenId: payload.jti,
      isSuperAdmin: admin.isSuperAdmin,
    };

    return true;
  }
}
