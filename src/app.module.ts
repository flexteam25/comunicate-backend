import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from './shared/logger/logger.module';
import { RedisModule } from './shared/redis/redis.module';
import { SocketModule } from './shared/socket/socket.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { User } from './modules/user/domain/entities/user.entity';
import { UserToken } from './modules/auth/domain/entities/user-token.entity';
import { Role } from './modules/user/domain/entities/role.entity';
import { Permission } from './modules/user/domain/entities/permission.entity';
import { Badge } from './modules/badge/domain/entities/badge.entity';
import { UserRole } from './modules/user/domain/entities/user-role.entity';
import { UserPermission } from './modules/user/domain/entities/user-permission.entity';
import { UserBadge } from './modules/user/domain/entities/user-badge.entity';
import { CorsTrustMiddleware } from './shared/middleware/cors-trust.middleware';
import { ApiThrottleMiddleware } from './shared/middleware/api-throttle.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'poca_db',
      entities: [
        User,
        UserToken,
        Role,
        Permission,
        Badge,
        UserRole,
        UserPermission,
        UserBadge,
      ],
      synchronize: false,
      logging: false,
    }),
    LoggerModule,
    RedisModule,
    SocketModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsTrustMiddleware, ApiThrottleMiddleware).forRoutes('*');
  }
}
