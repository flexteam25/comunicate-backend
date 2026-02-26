import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getClientIp } from '../utils/request.util';
import { MessageKeys } from '../exceptions/exception-helpers';
import { ApiResponseUtil } from '../dto/api-response.dto';

const USER_API_PREFIX = '/api';
const SKIP_PATHS = ['/health', '/metrics', '/favicon.ico', '/uploads'];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;

    if (!path.startsWith(USER_API_PREFIX)) {
      return next();
    }

    if (SKIP_PATHS.some((p) => path.startsWith(p))) {
      return next();
    }

    const mode = (process.env.MAINTENANCE_MODE || '').toLowerCase();
    const isMaintenanceEnabled = mode === 'true' || mode === '1';
    if (!isMaintenanceEnabled) {
      return next();
    }

    const clientIp = getClientIp(req);
    const allowedIpsEnv = process.env.MAINTENANCE_ALLOWED_IPS || '';
    const allowedIps = allowedIpsEnv
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0);

    if (allowedIps.length > 0 && allowedIps.includes(clientIp)) {
      return next();
    }

    res.status(503).json(ApiResponseUtil.error(MessageKeys.MAINTENANCE_MODE));
  }
}
