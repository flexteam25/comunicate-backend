import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../../../domain/entities/admin.entity';
import { IAdminRepository } from '../repositories/admin.repository';

@Injectable()
export class AdminRepository implements IAdminRepository {
  constructor(
    @InjectRepository(Admin)
    private readonly repository: Repository<Admin>,
  ) {}

  async findByEmail(email: string, relations?: string[]): Promise<Admin | null> {
    return this.repository.findOne({
      where: { email, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async findById(id: string, relations?: string[]): Promise<Admin | null> {
    return this.repository.findOne({
      where: { id, deletedAt: null },
      ...(relations && relations.length > 0 ? { relations } : {}),
    });
  }

  async create(admin: Admin): Promise<Admin> {
    const entity = this.repository.create(admin);
    return this.repository.save(entity);
  }

  async update(admin: Admin): Promise<Admin> {
    return this.repository.save(admin);
  }

  async save(admin: Admin): Promise<Admin> {
    return this.repository.save(admin);
  }
}

