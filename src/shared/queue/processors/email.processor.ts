import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../logger/logger.service';
import { EmailService } from '../../services/email/email.service';

export interface EmailJobData {
  to: string;
  subject: string;
  text: string;
  html: string;
  type: 'otp' | 'welcome' | 'other';
}

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<any> {
    const { to, subject, text, html, type } = job.data;

    try {
      const result = await this.emailService.sendEmailWithBoth(to, subject, text, html);

      if (!result.success) {
        this.logger.error('Email job failed', {
          jobId: job.id,
          to,
          subject,
          type,
          error: result.error,
        }, 'email-queue');
        throw new Error(result.error || 'Email sending failed');
      }

      return {
        success: true,
        to,
        type,
        messageId: result.messageId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Email processor error', {
        jobId: job.id,
        to,
        subject,
        type,
        error: (error as Error).message,
      }, 'email-queue');
      throw error;
    }
  }
}

