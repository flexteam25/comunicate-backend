import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorMessageKey {
  messageKey: string;
  params?: Record<string, string | number>;
}

/**
 * Extended HttpException that supports messageKey and params for i18n
 */
export class ApiExceptionWithKey extends HttpException {
  private readonly _messageKey: string;
  private readonly _params: Record<string, string | number>;

  constructor(
    messageKey: string,
    status: HttpStatus,
    params?: Record<string, string | number>,
  ) {
    const response: ErrorMessageKey = {
      messageKey,
      params: params || {},
    };
    // Set a descriptive message for logging
    const paramsStr = params && Object.keys(params).length > 0 
      ? ` with params: ${JSON.stringify(params)}`
      : '';
    super(response, status);
    this._messageKey = messageKey;
    this._params = params || {};
    // Override message property for better logging
    this.message = `[${HttpStatus[status]}] ${messageKey}${paramsStr}`;
  }

  getMessageKey(): string {
    return this._messageKey;
  }

  getParams(): Record<string, string | number> {
    return this._params;
  }
}
