import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MaintenanceCheckService } from '../../modules/system-settings/application/services/maintenance-check.service';
import { getClientIp } from '../utils/request.util';
import { MessageKeys } from '../exceptions/exception-helpers';
import { ApiResponseUtil } from '../dto/api-response.dto';

const USER_API_PREFIX = '/api';
const SKIP_PATHS = ['/health', '/metrics', '/favicon.ico', '/uploads'];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly maintenanceCheckService: MaintenanceCheckService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const path = req.path;

    if (!path.startsWith(USER_API_PREFIX)) {
      return next();
    }

    if (SKIP_PATHS.some((p) => path.startsWith(p))) {
      return next();
    }

    try {
      const maintenance = await this.maintenanceCheckService.getMaintenance();
      if (maintenance.status !== 1) {
        return next();
      }

      const clientIp = getClientIp(req);
      const allowedIps = maintenance.allowed_ips ?? [];
      if (allowedIps.length > 0 && allowedIps.includes(clientIp)) {
        return next();
      }

      res.status(503).json(ApiResponseUtil.error(MessageKeys.MAINTENANCE_MODE));
    } catch {
      next();
    }
  }
}
