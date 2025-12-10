import { UserToken } from '../../../domain/entities/user-token.entity';

export interface IUserTokenRepository {
  findByTokenId(tokenId: string): Promise<UserToken | null>;
  findByUserId(userId: string): Promise<UserToken[]>;
  create(token: UserToken): Promise<UserToken>;
  update(token: UserToken): Promise<UserToken>;
  revokeToken(tokenId: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
