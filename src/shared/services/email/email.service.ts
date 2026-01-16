import { Injectable, Inject } from '@nestjs/common';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EMAIL_PROVIDER,
} from './email-provider.interface';
import { LoggerService } from '../../logger/logger.service';

/**
 * Email Service
 * Provides a unified interface for sending emails through different providers
 */
@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const result = await this.emailProvider.sendEmail(options);

      if (result.success) {
      } else {
        this.logger.error(
          'Email sending failed',
          {
            to: options.to,
            subject: options.subject,
            error: result.error,
            messageId: result.messageId,
            provider: this.emailProvider.getProviderName(),
          },
          'email',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        'Email service error',
        {
          to: options.to,
          subject: options.subject,
          error: (error as Error).message,
        },
        'email',
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a simple text email
   */
  async sendTextEmail(
    to: string | string[],
    subject: string,
    text: string,
    options?: Partial<EmailOptions>,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject,
      text,
      ...options,
    });
  }

  /**
   * Send an HTML email
   */
  async sendHtmlEmail(
    to: string | string[],
    subject: string,
    html: string,
    options?: Partial<EmailOptions>,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject,
      html,
      ...options,
    });
  }

  /**
   * Send an email with both text and HTML
   */
  async sendEmailWithBoth(
    to: string | string[],
    subject: string,
    text: string,
    html: string,
    options?: Partial<EmailOptions>,
  ): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject,
      text,
      html,
      ...options,
    });
  }

  /**
   * Verify email provider configuration
   */
  async verifyConfiguration(): Promise<boolean> {
    try {
      const isValid = await this.emailProvider.verifyConfiguration();
      if (isValid) {
      } else {
        this.logger.error(
          'Email provider configuration invalid',
          {
            provider: this.emailProvider.getProviderName(),
          },
          'email',
        );
      }
      return isValid;
    } catch (error) {
      this.logger.error(
        'Email provider verification failed',
        {
          provider: this.emailProvider.getProviderName(),
          error: (error as Error).message,
        },
        'email',
      );
      return false;
    }
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.emailProvider.getProviderName();
  }
}
