import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameBackendClientService } from './game-backend-client.service';

@Module({
  imports: [ConfigModule],
  providers: [GameBackendClientService],
  exports: [GameBackendClientService],
})
export class GameBackendClientModule {}
