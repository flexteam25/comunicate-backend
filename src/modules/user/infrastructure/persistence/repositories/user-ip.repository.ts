import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIp } from '../../../domain/entities/user-ip.entity';
import { IUserIpRepository } from './user-ip.repository.interface';

@Injectable()
export class UserIpRepository implements IUserIpRepository {
  constructor(
    @InjectRepository(UserIp)
    private readonly repository: Repository<UserIp>,
  ) {}

  async findByUserIdAndIp(userId: string, ip: string): Promise<UserIp | null> {
    return this.repository.findOne({
      where: { userId, ip },
    });
  }

  async findByUserId(userId: string): Promise<UserIp[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIp(ip: string): Promise<UserIp[]> {
    return this.repository.find({
      where: { ip },
      order: { createdAt: 'DESC' },
    });
  }

  async findBlockedIps(): Promise<string[]> {
    const blockedIps = await this.repository.find({
      where: { isBlocked: true },
      select: ['ip'],
    });
    return [...new Set(blockedIps.map((ui) => ui.ip))];
  }

  async findBlockedIpsByUserId(userId: string): Promise<string[]> {
    const blockedIps = await this.repository.find({
      where: { userId, isBlocked: true },
      select: ['ip'],
    });
    return blockedIps.map((ui) => ui.ip);
  }

  async upsert(userIp: UserIp): Promise<UserIp> {
    return this.repository.save(userIp);
  }

  async bulkUpsert(userIps: Array<{ userId: string; ip: string }>): Promise<void> {
    if (userIps.length === 0) return;

    // Use PostgreSQL UPSERT (ON CONFLICT DO UPDATE)
    const values = userIps
      .map((ui, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::varchar, NOW(), NOW())`)
      .join(', ');

    const params = userIps.flatMap((ui) => [ui.userId, ui.ip]);

    await this.repository.query(
      `
      INSERT INTO user_ips (user_id, ip, created_at, updated_at)
      VALUES ${values}
      ON CONFLICT (user_id, ip) 
      DO UPDATE SET updated_at = NOW()
    `,
      params,
    );
  }

  async updateBlockStatus(
    userId: string,
    ip: string,
    isBlocked: boolean,
  ): Promise<UserIp | null> {
    const userIp = await this.findByUserIdAndIp(userId, ip);
    if (!userIp) {
      return null;
    }
    userIp.isBlocked = isBlocked;
    return this.repository.save(userIp);
  }

  async updateBlockStatusByIp(ip: string, isBlocked: boolean): Promise<void> {
    await this.repository.update({ ip }, { isBlocked });
  }
}

