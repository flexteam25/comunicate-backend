import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserToken } from './domain/entities/user-token.entity';
import { UserTokenRepository } from './infrastructure/persistence/typeorm/user-token.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserToken])],
  providers: [
    {
      provide: 'IUserTokenRepository',
      useClass: UserTokenRepository,
    },
    UserTokenRepository,
  ],
  exports: ['IUserTokenRepository', UserTokenRepository],
})
export class AuthPersistenceModule {}
