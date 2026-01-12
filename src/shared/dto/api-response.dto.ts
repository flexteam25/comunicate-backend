/**
 * Error message with key and params for i18n
 */
export interface ErrorMessage {
  messageKey: string;
  params?: Record<string, string | number>;
}

/**
 * Global API Response Format
 * Standardized response structure for all API endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string; // Legacy support, deprecated - use messageKey instead
  messageKey?: string;
  params?: Record<string, string | number>;
}

/**
 * Utility class for creating standardized API responses
 */
export class ApiResponseUtil {
  /**
   * Create a successful response
   * @param data - Response data
   * @param messageKey - Optional success message key
   * @param params - Optional parameters for the message
   * @returns ApiResponse with success: true
   */
  static success<T>(
    data: T,
    messageKey?: string,
    params?: Record<string, string | number>,
  ): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success: true,
      data,
    };
    if (messageKey) {
      response.messageKey = messageKey;
      response.params = params || {};
    }
    return response;
  }

  /**
   * Create an error response with messageKey and params
   * @param messageKey - Error message key for i18n
   * @param params - Optional parameters for the message
   * @param data - Optional error data
   * @returns ApiResponse with success: false
   */
  static error(
    messageKey: string,
    params?: Record<string, string | number>,
    data?: any,
  ): ApiResponse {
    return {
      success: false,
      data,
      messageKey,
      params: params || {},
    };
  }

  /**
   * Create a response with custom success status
   * @param success - Success status
   * @param data - Response data
   * @param messageKey - Optional message key
   * @param params - Optional parameters for the message
   * @returns ApiResponse
   */
  static create<T>(
    success: boolean,
    data?: T,
    messageKey?: string,
    params?: Record<string, string | number>,
  ): ApiResponse<T> {
    const response: ApiResponse<T> = {
      success,
      data,
    };
    if (messageKey) {
      response.messageKey = messageKey;
      response.params = params || {};
    }
    return response;
  }
}
