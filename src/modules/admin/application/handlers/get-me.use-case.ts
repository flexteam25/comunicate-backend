import { Injectable, Inject } from '@nestjs/common';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { Admin } from '../../domain/entities/admin.entity';
import { unauthorized } from '../../../../shared/exceptions/exception-helpers';
import { MessageKeys } from '../../../../shared/exceptions/exception-helpers';

@Injectable()
export class GetMeUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
  ) {}

  async execute(adminId: string): Promise<Admin> {
    const admin = await this.adminRepository.findById(adminId, [
      'adminRoles',
      'adminRoles.role',
      'adminPermissions',
      'adminPermissions.permission',
    ]);

    if (!admin) {
      throw unauthorized(MessageKeys.ADMIN_NOT_FOUND);
    }

    return admin;
  }
}
