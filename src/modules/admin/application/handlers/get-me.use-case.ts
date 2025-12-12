import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { Admin } from '../../domain/entities/admin.entity';

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
      throw new UnauthorizedException('Admin not found');
    }

    return admin;
  }
}

