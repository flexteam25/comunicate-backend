import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class TwilioService {
  private client: twilio.Twilio;
  private fromPhoneNumber: string;
  private isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    this.isEnabled = !!(accountSid && authToken && this.fromPhoneNumber);

    if (this.isEnabled) {
      this.client = twilio(accountSid, authToken);
      this.logger.info(
        'Twilio service initialized successfully',
        {
          fromPhoneNumber: this.fromPhoneNumber,
        },
        'twilio',
      );
    } else {
      const missingConfigs: string[] = [];
      if (!accountSid) missingConfigs.push('TWILIO_ACCOUNT_SID');
      if (!authToken) missingConfigs.push('TWILIO_AUTH_TOKEN');
      if (!this.fromPhoneNumber) missingConfigs.push('TWILIO_PHONE_NUMBER');

      this.logger.warn(
        'Twilio service not initialized - missing configuration',
        {
          missingConfigs,
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasPhoneNumber: !!this.fromPhoneNumber,
        },
        'twilio',
      );
    }
  }

  /**
   * Send SMS via Twilio
   * @param to Phone number in E.164 format (e.g., +84123456789)
   * @param message Message content
   * @returns Promise<boolean> True if sent successfully, false otherwise
   */
  async sendSms(to: string, message: string): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.warn('Twilio not configured, SMS not sent', { to, message }, 'twilio');
      return false;
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: to,
      });

      this.logger.info(
        'SMS sent successfully',
        {
          to,
          messageSid: result.sid,
          status: result.status,
        },
        'twilio',
      );

      return true;
    } catch (error) {
      let errorDetails: any = {
        error: error instanceof Error ? error.message : String(error),
        to,
        from: this.fromPhoneNumber,
      };

      // Extract Twilio-specific error details
      if (error && typeof error === 'object' && 'code' in error) {
        errorDetails = {
          ...errorDetails,
          twilioCode: error.code,
          twilioStatus: error.status,
          twilioMessage: error.message,
          twilioMoreInfo: error.moreInfo,
        };

        // Check if it's a trial account restriction
        if (
          error.code === 21211 ||
          error.message?.includes('cannot be sent with the current combination')
        ) {
          errorDetails.trialAccountRestriction = true;
          errorDetails.suggestion =
            'This error usually occurs with Twilio Trial accounts. You need to verify the recipient phone number in Twilio Console, or upgrade to a paid account.';
        }
      }

      this.logger.error('Failed to send SMS', errorDetails, 'twilio');
      return false;
    }
  }

  /**
   * Send OTP SMS
   * @param phone Phone number in E.164 format
   * @param otp OTP code
   * @returns Promise<boolean>
   */
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const message = `Your OTP code is: ${otp}. This code will expire in 1 minute.`;
    return this.sendSms(phone, message);
  }
}
