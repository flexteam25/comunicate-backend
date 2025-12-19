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

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
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
    let data: Record<string, unknown> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as HttpExceptionResponse;
        const responseMessage = Array.isArray(responseObj.message)
          ? responseObj.message.join(', ')
          : responseObj.message;

        message = responseMessage || exception.message || 'An error occurred';

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

    // For 500 errors, hide detailed message in production unless debug mode is enabled
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && !isDebugMode) {
      message = 'Internal server error';
      data = undefined;
    }

    // Format response using ApiResponseUtil
    const apiResponse = ApiResponseUtil.error(message, data);

    response.status(status).json(apiResponse);
  }
}
