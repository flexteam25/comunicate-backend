/**
 * Global API Response Format
 * Standardized response structure for all API endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Utility class for creating standardized API responses
 */
export class ApiResponseUtil {
  /**
   * Create a successful response
   * @param data - Response data
   * @param message - Optional success message
   * @returns ApiResponse with success: true
   */
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * Create an error response
   * @param message - Error message
   * @param data - Optional error data
   * @returns ApiResponse with success: false
   */
  static error(message: string, data?: any): ApiResponse {
    return {
      success: false,
      data,
      message,
    };
  }

  /**
   * Create a response with custom success status
   * @param success - Success status
   * @param data - Response data
   * @param message - Optional message
   * @returns ApiResponse
   */
  static create<T>(success: boolean, data?: T, message?: string): ApiResponse<T> {
    return {
      success,
      data,
      message,
    };
  }
}
