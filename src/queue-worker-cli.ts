import { CommandFactory } from 'nest-commander';
import { QueueWorkerCommandModule } from './commands/queue/queue-worker.module';

async function bootstrap() {
  await CommandFactory.run(QueueWorkerCommandModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
}

bootstrap();
