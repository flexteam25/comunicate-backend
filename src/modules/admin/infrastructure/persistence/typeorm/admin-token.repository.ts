import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminToken } from '../../../domain/entities/admin-token.entity';
import { IAdminTokenRepository } from '../repositories/admin-token.repository';

@Injectable()
export class AdminTokenRepository implements IAdminTokenRepository {
  constructor(
    @InjectRepository(AdminToken)
    private readonly repository: Repository<AdminToken>,
  ) {}

  async findByTokenId(tokenId: string): Promise<AdminToken | null> {
    return this.repository.findOne({
      where: { tokenId },
    });
  }

  async findByAdminId(adminId: string): Promise<AdminToken[]> {
    return this.repository.find({
      where: { adminId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(token: AdminToken): Promise<AdminToken> {
    const entity = this.repository.create(token);
    return this.repository.save(entity);
  }

  async update(token: AdminToken): Promise<AdminToken> {
    return this.repository.save(token);
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.repository.update({ tokenId }, { revokedAt: new Date() });
  }

  async revokeAllAdminTokens(adminId: string): Promise<void> {
    await this.repository.update({ adminId, revokedAt: null }, { revokedAt: new Date() });
  }
}
