import { CommandFactory } from 'nest-commander';
import { TriggerCommandModule } from './commands/trigger/trigger.module';

async function bootstrap() {
  await CommandFactory.run(TriggerCommandModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
}

bootstrap();
