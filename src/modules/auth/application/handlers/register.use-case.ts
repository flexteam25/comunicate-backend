import {
  Injectable,
  ConflictException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { EntityManager } from "typeorm";
import { IUserRepository } from "../../../user/infrastructure/persistence/repositories/user.repository";
import { PasswordService } from "../../../../shared/services/password.service";
import { TransactionService } from "../../../../shared/services/transaction.service";
import { User } from "../../../user/domain/entities/user.entity";
import { UserProfile } from "src/modules/user/domain/entities/user-profile.entity";

export interface RegisterCommand {
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  birthDate?: Date;
  gender?: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(forwardRef(() => "IUserRepository"))
    private readonly userRepository: IUserRepository,
    private readonly passwordService: PasswordService,
    private readonly transactionService: TransactionService
  ) {}

  async execute(command: RegisterCommand): Promise<User> {
    return this.transactionService.executeInTransaction(
      async (entityManager: EntityManager) => {
        // Check if user already exists
        const existingUser = await entityManager.findOne(User, {
          where: { email: command.email, deletedAt: null },
        });
        if (existingUser) {
          throw new ConflictException("User with this email already exists");
        }

        // Hash password
        const passwordHash = await this.passwordService.hashPassword(
          command.password
        );

        // Create user
        const user = new User();
        user.email = command.email;
        user.passwordHash = passwordHash;
        user.displayName = command.displayName || null;
        user.isActive = true;
        const profile = new UserProfile();
        profile.bio = command.bio || null;
        profile.phone = command.phone || null;
        profile.birthDate = command.birthDate || null;
        profile.gender = command.gender || null;

        profile.user = user;
        user.userProfile = profile;

        return entityManager.save(User, user);
      },
    );
  }
}
