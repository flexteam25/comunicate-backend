import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * CORS Trust Middleware
 *
 * Configures CORS to trust frontend game domain
 * Allows specific origins for iframe integration
 * Backend-to-backend authentication is handled by trust_ips in partners table
 */
@Injectable()
export class CorsTrustMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorsTrustMiddleware.name);

  // Bypass CORS check for testing (set BYPASS_CORS_ORIGIN=1)
  private readonly bypassCors: boolean = process.env.BYPASS_CORS_ORIGIN === '1';

  // Allowed origins from environment (game frontend domains)
  // Format: comma-separated list of origins (e.g., "https://game-frontend.com,https://www.game-frontend.com")
  private readonly allowedOrigins: string[] = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  use(req: Request, res: Response, next: NextFunction) {
    const origin = req.headers.origin;

    // Skip CORS check for backend-to-backend routes
    // These routes use trust_ips and trust_domains in partners table for authentication
    const backendToBackendRoutes = [
      '/api/auth/partner/authenticate',
      '/api/auth/refresh',
      '/api/auth/revoke',
    ];

    if (backendToBackendRoutes.some((route) => req.path.startsWith(route))) {
      // Backend-to-backend route: allow all (trust is handled by trust_ips/trust_domains)
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      // Set other CORS headers
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization, X-API-Key, X-API-Secret',
      );
      res.setHeader('Access-Control-Max-Age', '86400');

      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      next();
      return;
    }

    // Set CORS headers
    // Backend-to-backend authentication is handled by trust_ips in partners table
    // This middleware only handles frontend CORS

    // Bypass mode: allow all origins (for testing)
    if (this.bypassCors) {
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    } else {
      // Strict mode: require Origin header and check against allowed origins
      // Reject all requests that don't have Origin or have invalid Origin
      if (!origin) {
        // No origin header → reject immediately with 403 Forbidden
        this.logger.warn('CORS: Origin header is required but missing');
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: 'Missing data',
            error: 'Forbidden',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Origin is provided, check if it's allowed
      if (!this.isOriginAllowed(origin)) {
        // Origin is not allowed → reject with 403 Forbidden
        this.logger.warn(
          `CORS: Origin not allowed: ${origin}. Allowed origins: ${this.allowedOrigins.join(', ')}`,
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.FORBIDDEN,
            message: `Origin '${origin}' is not allowed. Allowed origins: ${this.allowedOrigins.join(', ')}`,
            error: 'Forbidden',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      // Origin is allowed → set exact origin
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Accept, Authorization, X-API-Key, X-API-Secret',
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      // For preflight, if origin is not allowed, still return 200
      // but without Access-Control-Allow-Origin header
      res.status(200).end();
      return;
    }

    // For actual requests, if origin is not allowed, continue
    // The browser will block the response if Access-Control-Allow-Origin is missing
    next();
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.some((allowed) => {
      // Exact match
      if (allowed === origin) {
        return true;
      }
      // Wildcard subdomain match
      if (allowed.startsWith('*.') && origin.endsWith(allowed.slice(1))) {
        return true;
      }
      return false;
    });
  }
}
