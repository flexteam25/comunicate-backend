/**
 * Email Provider Interface
 * Defines the contract for email sending providers
 */
export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  from?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Provider Interface
 * Implementations should handle sending emails through different providers
 */
export interface EmailProvider {
  /**
   * Send an email
   * @param options Email options
   * @returns Promise with email result
   */
  sendEmail(options: EmailOptions): Promise<EmailResult>;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Verify provider configuration
   */
  verifyConfiguration(): Promise<boolean>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
