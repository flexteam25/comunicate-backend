import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService, JwtPayload } from '../../../../shared/services/jwt.service';
import { IAdminTokenRepository } from '../persistence/repositories/admin-token.repository';
import { IAdminRepository } from '../persistence/repositories/admin.repository';

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
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token signature and expiration
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check if token is revoked in database
    const tokenRecord = await this.adminTokenRepository.findByTokenId(payload.jti);
    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found');
    }
    if (!tokenRecord.isValid()) {
      throw new UnauthorizedException('Token has been revoked or expired');
    }

    // Get admin info to check isSuperAdmin
    const admin = await this.adminRepository.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Admin not found or inactive');
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

