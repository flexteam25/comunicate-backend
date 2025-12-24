import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserTokenRepositoryModule } from './infrastructure/persistence/user-token-repository.module';
import { RegisterUseCase } from './application/handlers/register.use-case';
import { LoginUseCase } from './application/handlers/login.use-case';
import { RefreshTokenUseCase } from './application/handlers/refresh-token.use-case';
import { LogoutUseCase } from './application/handlers/logout.use-case';
import { RequestOtpUseCase } from './application/handlers/request-otp.use-case';
import { ResetPasswordUseCase } from './application/handlers/reset-password.use-case';
import { AuthController } from './interface/rest/auth.controller';
import { UserModule } from '../user/user.module';
import { PasswordService } from '../../shared/services/password.service';
import { JwtService } from '../../shared/services/jwt.service';
import { QueueClientModule } from '../../shared/queue/queue-client.module';
import { PartnerPersistenceModule } from '../partner/partner-persistence.module';

@Module({
  imports: [
    UserTokenRepositoryModule,
    ConfigModule,
    UserModule,
    QueueClientModule,
    PartnerPersistenceModule,
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestOtpUseCase,
    ResetPasswordUseCase,
    PasswordService,
    JwtService,
  ],
  exports: [UserTokenRepositoryModule, JwtService],
})
export class AuthModule {}
