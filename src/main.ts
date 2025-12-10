import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './shared/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  
  // Enable global exception filter
  app.useGlobalFilters(new ApiExceptionFilter());
  
  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Server started on port ${port}`);
}

bootstrap();
