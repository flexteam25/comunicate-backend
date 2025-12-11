import { User } from '../../../domain/entities/user.entity';

export interface IUserRepository {
  findByEmail(email: string, relations?: string[]): Promise<User | null>;
  findById(id: string, relations?: string[]): Promise<User | null>;
  findByIdWithBadges(id: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
  save(user: User): Promise<User>;
}
