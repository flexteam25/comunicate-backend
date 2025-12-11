import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { SmtpEmailProvider } from './smtp-email.provider';
import { EmailProvider, EMAIL_PROVIDER } from './email-provider.interface';
import { LoggerModule } from '../../logger/logger.module';

/**
 * Email Module
 * Provides email sending functionality with support for multiple SMTP providers
 */
@Global()
@Module({})
export class EmailModule {
  static forRoot(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule, LoggerModule],
      providers: [
        {
          provide: EMAIL_PROVIDER,
          useFactory: (configService: ConfigService): EmailProvider => {
            const providerType =
              configService.get<string>('EMAIL_PROVIDER') || 'smtp';

            switch (providerType.toLowerCase()) {
              case 'smtp':
              default:
                return new SmtpEmailProvider(configService);
            }
          },
          inject: [ConfigService],
        },
        EmailService,
      ],
      exports: [EmailService],
    };
  }
}

