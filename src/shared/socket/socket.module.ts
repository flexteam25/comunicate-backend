import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';
import { JwtService } from '../services/jwt.service';
import { RedisModule } from '../redis/redis.module';
import { AuthPersistenceModule } from '../../modules/auth/auth-persistence.module';

@Module({
  imports: [RedisModule, AuthPersistenceModule],
  controllers: [],
  providers: [SocketGateway, SocketService, JwtService],
  exports: [SocketService, SocketGateway],
})
export class SocketModule {}
