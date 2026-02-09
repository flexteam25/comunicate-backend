import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SocketAppModule } from './socket-app.module';

async function bootstrap() {
  const app = await NestFactory.create(SocketAppModule);
  const port = process.env.SOCKET_PORT || 3009;
  await app.listen(port);
  Logger.log(`Socket server started on port ${port}`);
}

void bootstrap();
