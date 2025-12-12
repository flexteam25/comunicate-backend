import { AdminToken } from '../../../domain/entities/admin-token.entity';

export interface IAdminTokenRepository {
  findByTokenId(tokenId: string): Promise<AdminToken | null>;
  findByAdminId(adminId: string): Promise<AdminToken[]>;
  create(token: AdminToken): Promise<AdminToken>;
  update(token: AdminToken): Promise<AdminToken>;
  revokeToken(tokenId: string): Promise<void>;
  revokeAllAdminTokens(adminId: string): Promise<void>;
}

