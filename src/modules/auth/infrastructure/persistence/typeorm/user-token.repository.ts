import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserToken } from '../../../domain/entities/user-token.entity';
import { IUserTokenRepository } from '../repositories/user-token.repository';

@Injectable()
export class UserTokenRepository implements IUserTokenRepository {
  constructor(
    @InjectRepository(UserToken)
    private readonly repository: Repository<UserToken>,
  ) {}

  async findByTokenId(tokenId: string): Promise<UserToken | null> {
    return this.repository.findOne({
      where: { tokenId },
    });
  }

  async findByUserId(userId: string): Promise<UserToken[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(token: UserToken): Promise<UserToken> {
    const entity = this.repository.create(token);
    return this.repository.save(entity);
  }

  async update(token: UserToken): Promise<UserToken> {
    return this.repository.save(token);
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.repository.update({ tokenId }, { revokedAt: new Date() });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.repository.update({ userId, revokedAt: null }, { revokedAt: new Date() });
  }
}
