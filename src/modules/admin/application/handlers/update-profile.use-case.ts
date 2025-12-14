import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { TransactionService } from '../../../../shared/services/transaction.service';
import { Admin } from '../../domain/entities/admin.entity';

export interface UpdateProfileCommand {
  adminId: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: UpdateProfileCommand): Promise<Admin> {
    // Find admin (outside transaction for validation)
    const admin = await this.adminRepository.findById(command.adminId);
    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Execute update in transaction
    return this.transactionService.executeInTransaction(async (entityManager: EntityManager) => {
      // Update fields
      if (command.displayName !== undefined) {
        admin.displayName = command.displayName || null;
      }

      if (command.avatarUrl !== undefined) {
        admin.avatarUrl = command.avatarUrl || null;
      }

      // Update admin
      return entityManager.save(Admin, admin);
    });
  }
}

