import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from './shared/logger/logger.module';
import { RedisModule } from './shared/redis/redis.module';
import { SocketModule } from './shared/socket/socket.module';
import { ServicesModule } from './shared/services/services.module';
import { QueueClientModule } from './shared/queue/queue-client.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AdminModule } from './modules/admin/admin.module';
import { User } from './modules/user/domain/entities/user.entity';
import { UserOldPassword } from './modules/user/domain/entities/user-old-password.entity';
import { UserToken } from './modules/auth/domain/entities/user-token.entity';
import { Role } from './modules/user/domain/entities/role.entity';
import { Permission } from './modules/user/domain/entities/permission.entity';
import { Badge } from './modules/badge/domain/entities/badge.entity';
import { UserRole } from './modules/user/domain/entities/user-role.entity';
import { UserPermission } from './modules/user/domain/entities/user-permission.entity';
import { UserBadge } from './modules/user/domain/entities/user-badge.entity';
import { Admin } from './modules/admin/domain/entities/admin.entity';
import { AdminToken } from './modules/admin/domain/entities/admin-token.entity';
import { AdminRole } from './modules/admin/domain/entities/admin-role.entity';
import { AdminPermission } from './modules/admin/domain/entities/admin-permission.entity';
import { AdminOldPassword } from './modules/user/domain/entities/admin-old-password.entity';
import { CorsTrustMiddleware } from './shared/middleware/cors-trust.middleware';

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
        UserOldPassword,
        UserToken,
        Role,
        Permission,
        Badge,
        UserRole,
        UserPermission,
        UserBadge,
        Admin,
        AdminToken,
        AdminRole,
        AdminPermission,
        AdminOldPassword,
      ],
      synchronize: false,
      logging: false,
    }),
    LoggerModule,
    RedisModule,
    SocketModule,
    ServicesModule,
    QueueClientModule,
    AuthModule,
    UserModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
