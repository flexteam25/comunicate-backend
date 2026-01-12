import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../../../infrastructure/persistence/repositories/user.repository';
import { PasswordService } from '../../../../../shared/services/password.service';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import { UserProfile } from '../../../domain/entities/user-profile.entity';
import { UserRole } from '../../../domain/entities/user-role.entity';
import { Role } from '../../../domain/entities/role.entity';
import { conflict, notFound, MessageKeys } from '../../../../../shared/exceptions/exception-helpers';

export interface CreateUserCommand {
  email: string;
  password: string;
  displayName?: string;
  isActive?: boolean;
  partner?: boolean;
  adminId: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Check if user already exists
        const existingUser = await entityManager.findOne(User, {
          where: { email: command.email, deletedAt: null },
        });
        if (existingUser) {
          throw conflict(MessageKeys.EMAIL_ALREADY_EXISTS);
        }

        // Hash password
        const passwordHash = await this.passwordService.hashPassword(command.password);

        // Create user
        const user = new User();
        user.email = command.email;
        user.passwordHash = passwordHash;
        user.displayName = command.displayName || null;
        user.isActive = command.isActive !== undefined ? command.isActive : true;

        // Create user profile
        const profile = new UserProfile();
        profile.bio = null;
        profile.phone = null;
        profile.birthDate = null;
        profile.gender = null;
        profile.points = 0;
        profile.user = user;
        user.userProfile = profile;

        const savedUser = await entityManager.save(User, user);

        // Assign role based on partner flag
        const roleRepo = entityManager.getRepository(Role);
        const userRoleRepo = entityManager.getRepository(UserRole);

        // Determine target role: partner=true => 'partner', partner=false => 'user'
        const targetRoleName = command.partner === true ? 'partner' : 'user';
        const targetRole = await roleRepo.findOne({
          where: { name: targetRoleName, deletedAt: null },
        });

        if (!targetRole) {
          throw notFound(MessageKeys.PARTNER_ROLE_NOT_FOUND, {
            roleName: targetRoleName,
          });
        }

        // Create user role
        const userRole = userRoleRepo.create({
          userId: savedUser.id,
          roleId: targetRole.id,
        });
        await userRoleRepo.save(userRole);

        return savedUser;
      },
    );
  }
}
