import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAdminRepository } from '../../infrastructure/persistence/repositories/admin.repository';
import { RedisService } from '../../../../shared/redis/redis.service';
import { QueueService } from '../../../../shared/queue/queue.service';
import { Admin } from '../../domain/entities/admin.entity';

export interface RequestOtpCommand {
  email: string;
}

@Injectable()
export class RequestOtpUseCase {
  private readonly isTestMail: boolean;

  constructor(
    @Inject('IAdminRepository')
    private readonly adminRepository: IAdminRepository,
    private readonly redisService: RedisService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.isTestMail =
      this.configService.get<string>('TEST_MAIL')?.toLowerCase() === 'true';
  }

  async execute(command: RequestOtpCommand): Promise<{ message: string; otp?: string }> {
    // Find admin by email
    const admin = await this.adminRepository.findByEmail(command.email);
    if (!admin) {
      throw new NotFoundException('Account not found');
    }

    if (!admin.isActive) {
      throw new NotFoundException('Account not found');
    }

    const redisKey = `otp:forgot-password:admin:${admin.id}`;
    const storedOtp = await this.redisService.getString(redisKey);
    if (storedOtp) {
      return {
        message:
          'An OTP has already been sent, please wait some minutes before requesting again',
      };
    }

    // Generate 6-digit OTP
    const otp = this.generateOtp();

    // Store OTP in Redis with 3 minutes TTL (180 seconds)
    await this.redisService.setString(redisKey, otp, 180);

    // In test mail mode, do NOT send email, just return OTP
    if (this.isTestMail) {
      return {
        message: 'OTP has been generated (test mail mode)',
        otp,
      };
    }

    // Queue OTP email job (non-blocking)
    await this.queueOtpEmail(admin, otp);

    // Return success message (don't reveal if admin exists)
    return { message: 'If the email exists, an OTP has been sent' };
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Queue OTP email job (non-blocking)
   */
  private async queueOtpEmail(admin: Admin, otp: string): Promise<void> {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hello <strong>${admin.displayName || admin.email}</strong>,</p>
          <p style="font-size: 16px;">You have requested to reset your password. Use the following OTP code to verify your identity:</p>
          <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 0;">${otp}</p>
          </div>
          <p style="font-size: 14px; color: #666;">This code will expire in 3 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this password reset, please ignore this email.</p>
          <p style="font-size: 16px;">Best regards,<br><strong>The POCA.GG Team</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
        Password Reset Request

        Hello ${admin.displayName || admin.email},

        You have requested to reset your password. Use the following OTP code to verify your identity:

        ${otp}

        This code will expire in 3 minutes.

        If you didn't request this password reset, please ignore this email.

        Best regards,
        The POCA.GG Team

        ---
        This is an automated email. Please do not reply.
    `;

    await this.queueService.addEmailJob({
      to: admin.email,
      subject: 'Password Reset OTP - POCA.GG Admin',
      text: emailText,
      html: emailHtml,
      type: 'otp',
    });
  }
}
