import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { IUserRepository } from '../repositories/user.repository';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email, deletedAt: null },
      relations: ['userRoles', 'userRoles.role', 'userPermissions', 'userPermissions.permission'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      relations: ['userRoles', 'userRoles.role', 'userPermissions', 'userPermissions.permission'],
    });
  }

  async create(user: User): Promise<User> {
    const entity = this.repository.create(user);
    return this.repository.save(entity);
  }

  async update(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }
}
