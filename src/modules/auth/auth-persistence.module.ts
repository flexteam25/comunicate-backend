import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserToken } from './domain/entities/user-token.entity';
import { UserTokenRepository } from './infrastructure/persistence/typeorm/user-token.repository';
import { OtpRequest } from './domain/entities/otp-request.entity';
import { OtpRequestRepository } from './infrastructure/persistence/typeorm/otp-request.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserToken, OtpRequest])],
  providers: [
    {
      provide: 'IUserTokenRepository',
      useClass: UserTokenRepository,
    },
    UserTokenRepository,
    {
      provide: 'IOtpRequestRepository',
      useClass: OtpRequestRepository,
    },
    OtpRequestRepository,
  ],
  exports: [
    'IUserTokenRepository',
    UserTokenRepository,
    'IOtpRequestRepository',
    OtpRequestRepository,
  ],
})
export class AuthPersistenceModule {}
