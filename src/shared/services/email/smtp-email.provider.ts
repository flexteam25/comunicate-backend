import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
} from './email-provider.interface';

/**
 * SMTP Email Provider
 * Supports multiple SMTP providers:
 * - Gmail, Outlook/Office365, Yahoo, Zoho, Yandex
 * - SendinBlue (Brevo), Mailgun, SendGrid
 * - Amazon SES, SMTP2Go, Postmark
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter;
  private readonly providerName: string;

  constructor(private readonly configService: ConfigService) {
    this.providerName =
      this.configService.get<string>('EMAIL_PROVIDER') || 'smtp';
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const auth = {
      user: this.configService.get<string>('SMTP_USER'),
      pass: this.configService.get<string>('SMTP_PASSWORD'),
    };

    // Provider-specific configuration
    const provider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');
    const providerConfig = this.getProviderConfig(provider, host, port, secure);

    this.transporter = nodemailer.createTransport({
      ...providerConfig,
      auth: auth.user && auth.pass ? auth : undefined,
    });
  }

  /**
   * Get provider-specific SMTP configuration
   */
  private getProviderConfig(
    provider: string,
    host?: string,
    port?: number,
    secure?: boolean,
  ): any {
    const defaultConfig = {
      host: host || 'localhost',
      port: port || 587,
      secure: secure || false,
    };

    // Provider-specific configurations
    switch (provider.toLowerCase()) {
      case 'gmail':
        return {
          service: 'gmail',
        };

      case 'outlook':
      case 'office365':
        return {
          host: host || 'smtp.office365.com',
          port: port || 587,
          secure: secure || false,
          tls: {
            ciphers: 'SSLv3',
          },
        };

      case 'yahoo':
        return {
          host: host || 'smtp.mail.yahoo.com',
          port: port || 587,
          secure: secure || false,
        };

      case 'zoho':
        return {
          host: host || 'smtp.zoho.com',
          port: port || 587,
          secure: secure || true,
        };

      case 'yandex':
        return {
          host: host || 'smtp.yandex.com',
          port: port || 465,
          secure: secure || true,
        };

      case 'sendinblue':
      case 'brevo':
        return {
          host: host || 'smtp-relay.brevo.com',
          port: port || 587,
          secure: secure || false,
        };

      case 'mailgun':
        return {
          host: host || 'smtp.mailgun.org',
          port: port || 587,
          secure: secure || false,
        };

      case 'sendgrid':
        return {
          host: host || 'smtp.sendgrid.net',
          port: port || 587,
          secure: secure || false,
        };

      case 'ses':
      case 'amazon-ses':
        return {
          host:
            host ||
            this.configService.get<string>('AWS_SES_HOST') ||
            'email-smtp.us-east-1.amazonaws.com',
          port: port || 587,
          secure: secure || false,
        };

      case 'smtp2go':
        return {
          host: host || 'mail.smtp2go.com',
          port: port || 587,
          secure: secure || false,
        };

      case 'postmark':
        return {
          host: host || 'smtp.postmarkapp.com',
          port: port || 587,
          secure: secure || false,
        };

      default:
        // Generic SMTP
        return defaultConfig;
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const from =
        options.from ||
        this.configService.get<string>('SMTP_FROM') ||
        this.configService.get<string>('SMTP_USER');

      if (!from) {
        return {
          success: false,
          error: 'From address is required',
        };
      }

      const mailOptions = {
        from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(', ')
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(', ')
            : options.bcc
          : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getProviderName(): string {
    return this.providerName;
  }

  async verifyConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}

