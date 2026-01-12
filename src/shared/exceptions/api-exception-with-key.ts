import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorMessageKey {
  messageKey: string;
  params?: Record<string, string | number>;
}

/**
 * Extended HttpException that supports messageKey and params for i18n
 */
export class ApiExceptionWithKey extends HttpException {
  constructor(
    messageKey: string,
    status: HttpStatus,
    params?: Record<string, string | number>,
  ) {
    const response: ErrorMessageKey = {
      messageKey,
      params: params || {},
    };
    super(response, status);
  }

  getMessageKey(): string {
    const response = this.getResponse();
    if (typeof response === 'object' && response !== null && 'messageKey' in response) {
      return (response as ErrorMessageKey).messageKey;
    }
    return 'INTERNAL_SERVER_ERROR';
  }

  getParams(): Record<string, string | number> {
    const response = this.getResponse();
    if (typeof response === 'object' && response !== null && 'params' in response) {
      return (response as ErrorMessageKey).params || {};
    }
    return {};
  }
}
