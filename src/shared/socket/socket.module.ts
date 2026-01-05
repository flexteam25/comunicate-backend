import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';
import { JwtService } from '../services/jwt.service';
import { RedisModule } from '../redis/redis.module';
import { AuthPersistenceModule } from '../../modules/auth/auth-persistence.module';
import { AdminModule } from '../../modules/admin/admin.module';

@Module({
  imports: [RedisModule, AuthPersistenceModule, AdminModule],
  controllers: [],
  providers: [SocketGateway, SocketService, JwtService],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
