import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueWorkerCommand } from './queue-worker.command';
import { QueueWorkerModule as SharedQueueWorkerModule } from '../../shared/queue/queue-worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: false, // Don't auto-sync in worker
    }),
    SharedQueueWorkerModule, // Import processors and GameModule
  ],
  providers: [QueueWorkerCommand],
})
export class QueueWorkerCommandModule {}
