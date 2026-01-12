import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IAdminPermissionRepository } from '../persistence/repositories/admin-permission.repository';
import { IAdminRepository } from '../persistence/repositories/admin.repository';
import { forbidden } from '../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    @Inject('IAdminPermissionRepository')
    private readonly adminPermissionRepository: IAdminPermissionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) {
      // No permission required
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ admin?: { adminId: string; isSuperAdmin: boolean } }>();
    const admin = request.admin;

    if (!admin) {
      throw forbidden(MessageKeys.PERMISSION_DENIED);
    }

    // Super admin bypasses all permission checks
    if (admin.isSuperAdmin) {
      return true;
    }

    // Check if admin has the required permission
    const hasPermission = await this.adminPermissionRepository.hasPermission(
      admin.adminId,
      requiredPermission,
    );

    if (!hasPermission) {
      throw forbidden(MessageKeys.PERMISSION_DENIED, { permission: requiredPermission });
    }

    return true;
  }
}
