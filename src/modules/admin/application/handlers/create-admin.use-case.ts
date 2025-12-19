import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { IAdminPermissionRepository } from '../../infrastructure/persistence/repositories/admin-permission.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { Admin } from '../../domain/entities/admin.entity';
import { AdminPermission } from '../../domain/entities/admin-permission.entity';
import { Permission } from '../../../user/domain/entities/permission.entity';

export interface CreateAdminCommand {
  creatorAdminId: string;
  email: string;
  password: string;
  displayName?: string;
  permissionIds?: string[];
}

@Injectable()
export class CreateAdminUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    @Inject('IAdminPermissionRepository')
    private readonly adminPermissionRepository: IAdminPermissionRepository,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateAdminCommand): Promise<Admin> {
    // Check if creator has permission (outside transaction)
    const creator = await this.adminRepository.findById(command.creatorAdminId);
    if (!creator) {
      throw new BadRequestException('Creator admin not found');
    }

    // Super admin bypasses permission check
    if (!creator.isSuperAdmin) {
      // Check if creator has admin.create permission
      const hasPermission = await this.adminPermissionRepository.hasPermission(
        command.creatorAdminId,
        'admin.create',
      );
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to create admins');
      }
    }

    // Check if email already exists (outside transaction)
    const existingAdmin = await this.adminRepository.findByEmail(command.email);
    if (existingAdmin) {
      throw new BadRequestException('Email already exists');
    }

    // Hash password (outside transaction)
    const passwordHash = await this.passwordService.hashPassword(command.password);

    // Execute database operations in transaction
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Create admin
        const admin = new Admin();
        admin.email = command.email;
        admin.passwordHash = passwordHash;
        admin.displayName = command.displayName || null;
        admin.isActive = true;
        admin.isSuperAdmin = false;

        const savedAdmin = await entityManager.save(Admin, admin);

        // Assign permissions if provided
        if (command.permissionIds && command.permissionIds.length > 0) {
          for (const permissionId of command.permissionIds) {
            // Verify permission exists
            const permission = await entityManager.findOne(Permission, {
              where: { id: permissionId },
            });
            if (permission) {
              const adminPermission = new AdminPermission();
              adminPermission.adminId = savedAdmin.id;
              adminPermission.permissionId = permissionId;
              await entityManager.save(AdminPermission, adminPermission);
            }
          }
        }

        return savedAdmin;
      },
    );
  }
}
