import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository } from '../../infrastructure/persistence/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';

export interface UpdateProfileCommand {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(@Inject('IUserRepository') private readonly userRepository: IUserRepository) {}

  async execute(command: UpdateProfileCommand): Promise<User> {
    // Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update fields
    if (command.displayName !== undefined) {
      user.displayName = command.displayName || null;
    }

    // Update user
    return this.userRepository.update(user);
  }
}
