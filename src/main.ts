import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ApiExceptionFilter } from './shared/filters/api-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { LoggerService } from './shared/logger/logger.service';
import { ApiThrottleMiddleware } from './shared/middleware/api-throttle.middleware';
import { CorsTrustMiddleware } from './shared/middleware/cors-trust.middleware';

async function bootstrap() {
  // CORS is handled by CorsTrustMiddleware
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from uploads directory
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads',
  });

  // Set global API prefix
  app.setGlobalPrefix('api');
  
  // Enable global exception filter with LoggerService
  const loggerService = app.get(LoggerService);
  app.useGlobalFilters(new ApiExceptionFilter(loggerService));

  const corsTrustMiddleware = new CorsTrustMiddleware();
  app.use((req, res, next) => corsTrustMiddleware.use(req, res, next));
  
  // Apply API throttle middleware
  const apiThrottleMiddleware = new ApiThrottleMiddleware(loggerService);
  app.use((req, res, next) => apiThrottleMiddleware.use(req, res, next));
  
  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3008;
  await app.listen(port);
  Logger.log(`Server started on port ${port}`);
  Logger.log(`Static files served from /${uploadDir}`);
}

void bootstrap();
