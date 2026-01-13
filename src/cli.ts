import { CommandFactory } from 'nest-commander';
import { CliCommandModule } from './commands/cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliCommandModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
}

bootstrap();
