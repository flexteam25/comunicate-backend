import { UserIp } from '../../../domain/entities/user-ip.entity';

export interface IUserIpRepository {
  findByUserIdAndIp(userId: string, ip: string): Promise<UserIp | null>;
  findByUserId(userId: string): Promise<UserIp[]>;
  findByIp(ip: string): Promise<UserIp[]>;
  findBlockedIps(): Promise<string[]>;
  findBlockedIpsByUserId(userId: string): Promise<string[]>;
  upsert(userIp: UserIp): Promise<UserIp>;
  bulkUpsert(userIps: Array<{ userId: string; ip: string }>): Promise<void>;
  updateBlockStatus(userId: string, ip: string, isBlocked: boolean): Promise<UserIp | null>;
  updateBlockStatusByIp(ip: string, isBlocked: boolean): Promise<void>;
}

