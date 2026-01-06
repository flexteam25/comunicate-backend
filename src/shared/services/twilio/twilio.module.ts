import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwilioService } from './twilio.service';
import { LoggerModule } from '../../logger/logger.module';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [TwilioService],
  exports: [TwilioService],
})
export class TwilioModule {}
