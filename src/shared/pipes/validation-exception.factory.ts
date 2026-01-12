import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ApiExceptionWithKey } from '../exceptions/api-exception-with-key';
import { propertyNameToNaturalLanguage } from '../utils/property-name.util';

/**
 * Maps validation error constraint to messageKey and params
 */
function mapValidationErrorToMessageKey(error: ValidationError): {
  messageKey: string;
  params?: Record<string, string | number>;
} {
  const property = error.property;
  const constraints = error.constraints || {};
  const constraintKeys = Object.keys(constraints);

  if (constraintKeys.length === 0) {
    return {
      messageKey: 'VALIDATION_FAILED',
      params: { property: propertyNameToNaturalLanguage(property) },
    };
  }

  // Get the first constraint (since stopAtFirstError is enabled)
  const constraintKey = constraintKeys[0];
  const constraintValue = constraints[constraintKey];

  // Extract params from constraint value if possible
  // Convert property name to natural language for frontend display
  const params: Record<string, string | number> = {
    property: propertyNameToNaturalLanguage(property),
  };

  // Map common validation constraints to message keys
  switch (constraintKey) {
    case 'isNotEmpty':
      return { messageKey: `${property.toUpperCase()}_REQUIRED`, params };
    case 'isString':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_STRING`, params };
    case 'isEmail':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_EMAIL`, params };
    case 'isInt':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_INTEGER`, params };
    case 'isBoolean':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_BOOLEAN`, params };
    case 'isEnum':
      return { messageKey: `${property.toUpperCase()}_INVALID_ENUM`, params };
    case 'isUUID':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_UUID`, params };
    case 'isDate':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_DATE`, params };
    case 'isDateString':
      return { messageKey: `${property.toUpperCase()}_MUST_BE_DATE_STRING`, params };
    case 'minLength': {
      // Extract number from message: "password must be longer than or equal to 8 characters"
      // or "password should not be shorter than 8 characters"
      const match = constraintValue.match(
        /(?:longer than or equal to|shorter than|length is) (\d+)/i,
      );
      const length = match ? parseInt(match[1], 10) : 8; // Default fallback
      return {
        messageKey: `${property.toUpperCase()}_MIN_LENGTH`,
        params: { ...params, length },
      };
    }
    case 'maxLength': {
      // Extract number from message: "password must not be longer than 100 characters"
      // or "password must not exceed 100 characters"
      const match = constraintValue.match(
        /(?:not be longer than|not exceed|must not exceed) (\d+)/i,
      );
      const length = match ? parseInt(match[1], 10) : 0;
      return {
        messageKey: `${property.toUpperCase()}_MAX_LENGTH`,
        params: { ...params, length },
      };
    }
    case 'min': {
      // Extract number from message: "points must not be less than 0"
      const match = constraintValue.match(
        /(?:not be less than|must not be less than|must be greater than or equal to) (\d+)/i,
      );
      const min = match ? parseInt(match[1], 10) : 0;
      return {
        messageKey: `${property.toUpperCase()}_MIN_VALUE`,
        params: { ...params, min },
      };
    }
    case 'max': {
      // Extract number from message: "points must not be greater than 50000"
      const match = constraintValue.match(
        /(?:not be greater than|must not be greater than|must be less than or equal to) (\d+)/i,
      );
      const max = match ? parseInt(match[1], 10) : 0;
      return {
        messageKey: `${property.toUpperCase()}_MAX_VALUE`,
        params: { ...params, max },
      };
    }
    case 'isOptional':
      return { messageKey: `${property.toUpperCase()}_OPTIONAL`, params };
    default:
      // Check if it's a custom constraint class name (ends with Constraint) or named maxKoreanChars
      if (
        constraintKey.endsWith('Constraint') ||
        constraintKey === 'maxKoreanChars' ||
        constraintKey === 'MaxKoreanCharsConstraint'
      ) {
        // For MaxKoreanChars validator, extract maxChars from message
        // Example: "displayName must have at most 6 Korean character(s)"
        const maxMatch = constraintValue.match(/at most (\d+)/i);
        if (maxMatch) {
          const maxChars = parseInt(maxMatch[1], 10);
          return {
            messageKey: `${property.toUpperCase()}_MAX_KOREAN_CHARS`,
            params: { ...params, maxChars },
          };
        }
      }
      // Try to extract messageKey from custom validator if it's in the format "MESSAGE_KEY"
      if (constraintValue.match(/^[A-Z_]+$/)) {
        return { messageKey: constraintValue, params };
      }
      // Fallback: use generic validation error
      return {
        messageKey: 'VALIDATION_FAILED',
        params: {
          property: propertyNameToNaturalLanguage(property),
          constraint: constraintKey,
        },
      };
  }
}

/**
 * Custom exception factory for ValidationPipe
 * Converts validation errors to ApiExceptionWithKey with messageKey and params
 */
export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  // Get first error (since stopAtFirstError is enabled)
  const firstError = errors[0];
  const { messageKey, params } = mapValidationErrorToMessageKey(firstError);

  return new ApiExceptionWithKey(messageKey, 400, params) as BadRequestException;
}
