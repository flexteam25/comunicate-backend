import { Injectable, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { IUserRepository } from '../../../user/infrastructure/persistence/repositories/user.repository';
import { PasswordService } from '../../../../shared/services/password.service';
import { User } from '../../../user/domain/entities/user.entity';

export interface RegisterCommand {
  email: string;
  password: string;
  displayName?: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(forwardRef(() => 'IUserRepository'))
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(command: RegisterCommand): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(command.password);

    // Create user
    const user = new User();
    user.email = command.email;
    user.passwordHash = passwordHash;
    user.displayName = command.displayName || null;
    user.isActive = true;

    return this.userRepository.create(user);
  }
}
