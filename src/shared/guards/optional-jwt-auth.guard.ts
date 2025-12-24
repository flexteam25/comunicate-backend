import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService, JwtPayload } from '../services/jwt.service';
import { IUserTokenRepository } from '../../modules/auth/infrastructure/persistence/repositories/user-token.repository';

interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    tokenId: string;
  };
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject('IUserTokenRepository')
    private readonly userTokenRepository: IUserTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    // No auth header -> allow request without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.substring(7);

    // Verify token signature and expiration
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verifyAccessToken(token);
    } catch {
      return true;
    }

    // Check if token is revoked in database
    const tokenRecord = await this.userTokenRepository.findByTokenId(payload.jti);
    if (!tokenRecord || !tokenRecord.isValid()) {
      return true;
    }

    // Attach user info to request
    request.user = {
      userId: payload.sub,
      email: payload.email,
      tokenId: payload.jti,
    };

    return true;
  }
}
