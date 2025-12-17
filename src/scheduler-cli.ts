import { CommandFactory } from 'nest-commander';
import { SchedulerCommandModule } from './commands/scheduler/scheduler.module';

async function bootstrap() {
  await CommandFactory.run(SchedulerCommandModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
}

bootstrap();
