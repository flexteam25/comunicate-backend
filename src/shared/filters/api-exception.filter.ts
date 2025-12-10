import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseUtil } from '../dto/api-response.dto';

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
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Check if debug mode is enabled (show detailed error messages)
    const isDebugMode =
      process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';

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
