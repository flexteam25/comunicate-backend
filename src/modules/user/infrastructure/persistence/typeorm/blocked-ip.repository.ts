import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockedIp } from '../../../domain/entities/blocked-ip.entity';
import { IBlockedIpRepository } from '../../../infrastructure/persistence/repositories/blocked-ip.repository.interface';

@Injectable()
export class BlockedIpRepository implements IBlockedIpRepository {
  constructor(
    @InjectRepository(BlockedIp)
    private readonly repository: Repository<BlockedIp>,
  ) {}

  async findByIp(ip: string): Promise<BlockedIp | null> {
    return this.repository.findOne({
      where: { ip },
    });
  }

  async findAll(): Promise<BlockedIp[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findBlockedIps(): Promise<string[]> {
    const blockedIps = await this.repository.find({
      select: ['ip'],
    });
    return blockedIps.map((bi) => bi.ip);
  }

  async create(blockedIp: BlockedIp): Promise<BlockedIp> {
    return this.repository.save(blockedIp);
  }

  async delete(ip: string): Promise<void> {
    await this.repository.delete({ ip });
  }
}
