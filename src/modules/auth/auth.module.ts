import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserToken } from './domain/entities/user-token.entity';
import { UserTokenRepository } from './infrastructure/persistence/typeorm/user-token.repository';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([UserToken]),
    ConfigModule,
    forwardRef(() => UserModule),
    QueueClientModule,
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: 'IUserTokenRepository',
      useClass: UserTokenRepository,
    },
    UserTokenRepository,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    RequestOtpUseCase,
    ResetPasswordUseCase,
    PasswordService,
    JwtService,
  ],
  exports: [UserTokenRepository, 'IUserTokenRepository', JwtService],
})
export class AuthModule {}
