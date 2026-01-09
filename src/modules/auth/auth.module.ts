import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthPersistenceModule } from './auth-persistence.module';
import { RegisterUseCase } from './application/handlers/register.use-case';
import { LoginUseCase } from './application/handlers/login.use-case';
import { RefreshTokenUseCase } from './application/handlers/refresh-token.use-case';
import { LogoutUseCase } from './application/handlers/logout.use-case';
import { RequestOtpUseCase } from './application/handlers/request-otp.use-case';
import { RequestOtpPhoneUseCase } from './application/handlers/request-otp-phone.use-case';
import { VerifyOtpUseCase } from './application/handlers/verify-otp.use-case';
import { VerifyOtpForgotPasswordUseCase } from './application/handlers/verify-otp-forgot-password.use-case';
import { ResetPasswordUseCase } from './application/handlers/reset-password.use-case';
import { AuthController } from './interface/rest/auth.controller';
import { UserPersistenceModule } from '../user/user-persistence.module';
import { PasswordService } from '../../shared/services/password.service';
import { JwtService } from '../../shared/services/jwt.service';
import { QueueClientModule } from '../../shared/queue/queue-client.module';
import { PartnerPersistenceModule } from '../partner/partner-persistence.module';
import { TwilioModule } from '../../shared/services/twilio/twilio.module';
import { RedisModule } from '../../shared/redis/redis.module';

@Module({
  imports: [
    AuthPersistenceModule,
    ConfigModule,
    UserPersistenceModule,
    QueueClientModule,
    PartnerPersistenceModule,
    TwilioModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestOtpUseCase,
    RequestOtpPhoneUseCase,
    VerifyOtpUseCase,
    VerifyOtpForgotPasswordUseCase,
    ResetPasswordUseCase,
    PasswordService,
    JwtService,
  ],
  exports: [AuthPersistenceModule, JwtService],
})
export class AuthModule {}
