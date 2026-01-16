import { BlockedIp } from '../../../domain/entities/blocked-ip.entity';

export interface IBlockedIpRepository {
  findByIp(ip: string): Promise<BlockedIp | null>;
  findAll(): Promise<BlockedIp[]>;
  findBlockedIps(): Promise<string[]>;
  create(blockedIp: BlockedIp): Promise<BlockedIp>;
  delete(ip: string): Promise<void>;
}
