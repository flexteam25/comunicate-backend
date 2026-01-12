import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseUtil } from '../dto/api-response.dto';
import { LoggerService } from '../logger/logger.service';
import { ApiExceptionWithKey } from '../exceptions/api-exception-with-key';

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  messageKey?: string;
  params?: Record<string, string | number>;
}

/**
 * Global exception filter to format all exceptions into API response DTO format
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if debug mode is enabled (show detailed error messages)
    const isDebugMode = process.env.DEBUG_MODE === 'true';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let messageKey: string | undefined = undefined;
    let params: Record<string, string | number> | undefined = undefined;
    let data: Record<string, unknown> | undefined = undefined;

    if (exception instanceof ApiExceptionWithKey) {
      // Handle custom exception with messageKey and params
      status = exception.getStatus();
      messageKey = exception.getMessageKey();
      params = exception.getParams();
      message = exception.message; // Keep for logging
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as HttpExceptionResponse;

        // Check if response has messageKey (from ApiExceptionWithKey)
        if (responseObj.messageKey) {
          messageKey = responseObj.messageKey;
          params = responseObj.params || {};
        } else {
          // Legacy format - convert message to messageKey if possible
          const responseMessage = Array.isArray(responseObj.message)
            ? responseObj.message.join(', ')
            : responseObj.message;
          message = responseMessage || exception.message || 'An error occurred';
        }

        // Include additional error details if available
        if (responseObj.error || responseObj.statusCode) {
          data = {
            error: responseObj.error,
            statusCode: responseObj.statusCode,
          };
        }
      } else {
        message = exception.message || 'An error occurred';
      }
    } else if (exception instanceof Error) {
      message = exception.message || 'An error occurred';
    }

    // Log error with details
    // Format stack trace as array for better readability
    let stackTrace: string[] | undefined = undefined;
    if (exception instanceof Error && exception.stack) {
      stackTrace = exception.stack.split('\n').map((line) => line.trim());
    }

    const logData = {
      status,
      message,
      path: request.url,
      method: request.method,
      ip: request.ip,
      stack: stackTrace,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('Server error', logData, 'error');
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn('Client error', logData, 'error');
    }

    // Map HTTP status codes to messageKey if not already set
    if (!messageKey) {
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          messageKey = 'BAD_REQUEST';
          break;
        case HttpStatus.UNAUTHORIZED:
          messageKey = 'UNAUTHORIZED';
          break;
        case HttpStatus.FORBIDDEN:
          messageKey = 'FORBIDDEN';
          break;
        case HttpStatus.NOT_FOUND:
          messageKey = 'NOT_FOUND';
          break;
        case HttpStatus.CONFLICT:
          messageKey = 'CONFLICT';
          break;
        case HttpStatus.INTERNAL_SERVER_ERROR:
          messageKey = 'INTERNAL_SERVER_ERROR';
          // For 500 errors, hide detailed message in production unless debug mode is enabled
          if (!isDebugMode) {
            message = 'Internal server error';
            params = undefined;
            data = undefined;
          }
          break;
        default:
          messageKey = 'INTERNAL_SERVER_ERROR';
      }
    } else {
      // For 500 errors with messageKey, hide detailed message in production unless debug mode is enabled
      if (status === HttpStatus.INTERNAL_SERVER_ERROR && !isDebugMode) {
        message = 'Internal server error';
        messageKey = 'INTERNAL_SERVER_ERROR';
        params = undefined;
        data = undefined;
      }
    }

    // Format response using ApiResponseUtil
    // Always use messageKey format
    const apiResponse = ApiResponseUtil.error(messageKey, params || {}, data);

    response.status(status).json(apiResponse);
  }
}
