import { CommandFactory } from 'nest-commander';
import { SiteReviewStatisticsCommandModule } from './commands/site-review-statistics/site-review-statistics.module';

async function bootstrap() {
  await CommandFactory.run(SiteReviewStatisticsCommandModule, {
    logger: ['error', 'warn', 'log'],
  });
}

bootstrap();

