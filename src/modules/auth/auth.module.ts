import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserToken } from './domain/entities/user-token.entity';
import { UserTokenRepository } from './infrastructure/persistence/typeorm/user-token.repository';
import { RegisterUseCase } from './application/handlers/register.use-case';
import { LoginUseCase } from './application/handlers/login.use-case';
import { RefreshTokenUseCase } from './application/handlers/refresh-token.use-case';
import { LogoutUseCase } from './application/handlers/logout.use-case';
import { AuthController } from './interface/rest/auth.controller';
import { UserModule } from '../user/user.module';
import { PasswordService } from '../../shared/services/password.service';
import { JwtService } from '../../shared/services/jwt.service';
import { IUserRepository } from '../user/infrastructure/persistence/repositories/user.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserToken]),
    ConfigModule,
    forwardRef(() => UserModule),
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
    PasswordService,
    JwtService,
  ],
  exports: [UserTokenRepository, 'IUserTokenRepository', JwtService],
})
export class AuthModule {}
