import {
  UserOldPassword,
  UserOldPasswordType,
} from '../../../domain/entities/user-old-password.entity';

export interface IUserOldPasswordRepository {
  create(oldPassword: UserOldPassword): Promise<UserOldPassword>;
  findByUserId(userId: string, limit?: number): Promise<UserOldPassword[]>;
  findByUserIdAndType(
    userId: string,
    type: UserOldPasswordType,
    limit?: number,
  ): Promise<UserOldPassword[]>;
}
