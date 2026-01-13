import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ApiExceptionWithKey } from '../exceptions/api-exception-with-key';
import { propertyNameToNaturalLanguage } from '../utils/property-name.util';

/**
 * Maps validation error constraint to messageKey and params
 *
 * IMPORTANT: This function now requires messageKey to be explicitly specified
 * in the validation decorator's message option. It will NOT auto-generate keys.
 *
 * Usage in DTOs:
 * @IsEmail({}, { message: 'EMAIL_MUST_BE_EMAIL' })
 * @MinLength(8, { message: 'PASSWORD_MIN_LENGTH' })
 * @IsNotEmpty({ message: 'EMAIL_REQUIRED' })
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

  // PRIORITY 1: Check if constraintValue is a messageKey (format: MESSAGE_KEY)
  // This happens when messageKey is explicitly specified in decorator: { message: 'MESSAGE_KEY' }
  if (
    typeof constraintValue === 'string' &&
    constraintValue.match(/^[A-Z_][A-Z0-9_]*$/)
  ) {
    // Extract numeric params from constraint arguments
    // In class-validator, constraint arguments are stored in error.contexts
    const constraintContext = error.contexts?.[constraintKey] as
      | Record<string, unknown>
      | undefined;

    // Try to extract params from constraint context or error metadata
    if (constraintKey === 'minLength' || constraintKey === 'maxLength') {
      // For MinLength/MaxLength, the value is the first argument
      // It's stored in constraint context or we can try to get from error
      const length =
        (constraintContext?.value as number | undefined) ||
        (constraintContext?.min as number | undefined) ||
        (constraintContext?.max as number | undefined) ||
        (constraintContext?.length as number | undefined);
      if (length !== undefined && typeof length === 'number') {
        params.length = length;
      }
    } else if (constraintKey === 'min' || constraintKey === 'max') {
      const value =
        (constraintContext?.value as number | undefined) ||
        (constraintContext?.min as number | undefined) ||
        (constraintContext?.max as number | undefined);
      if (value !== undefined && typeof value === 'number') {
        params[constraintKey === 'min' ? 'min' : 'max'] = value;
      }
    } else if (
      constraintKey.endsWith('Constraint') ||
      constraintKey === 'maxKoreanChars' ||
      constraintKey === 'MaxKoreanCharsConstraint'
    ) {
      // For MaxKoreanChars, try to extract maxChars from constraint context
      const maxChars =
        (constraintContext?.maxChars as number | undefined) ||
        (constraintContext?.value as number | undefined);
      if (maxChars !== undefined && typeof maxChars === 'number') {
        params.maxChars = maxChars;
      }
    }

    return { messageKey: constraintValue, params };
  }

  // PRIORITY 2: For custom validators that return messageKey directly
  // Check if it's a custom constraint that might have messageKey in its context
  if (
    constraintKey.endsWith('Constraint') ||
    constraintKey === 'maxKoreanChars' ||
    constraintKey === 'MaxKoreanCharsConstraint'
  ) {
    // Try to extract messageKey from constraint value if it's in MESSAGE_KEY format
    if (
      typeof constraintValue === 'string' &&
      constraintValue.match(/^[A-Z_][A-Z0-9_]*$/)
    ) {
      const maxChars = extractNumberFromMessage(constraintValue, 'maxKoreanChars');
      if (maxChars !== undefined) {
        params.maxChars = maxChars;
      }
      return { messageKey: constraintValue, params };
    }
  }

  // FALLBACK: If no explicit messageKey is found, use VALIDATION_FAILED
  // This ensures we don't auto-generate keys and forces developers to specify them
  return {
    messageKey: 'VALIDATION_FAILED',
    params: {
      property: propertyNameToNaturalLanguage(property),
      constraint: constraintKey,
      message: constraintValue,
    },
  };
}

/**
 * Helper to extract numeric values from error metadata or fallback parsing
 */
function extractNumberFromMessage(message: string, type: string): number | undefined {
  // Try to extract from common patterns (fallback only)
  if (type === 'minLength' || type === 'maxLength') {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  if (type === 'min' || type === 'max') {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  if (type === 'maxKoreanChars') {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
  return undefined;
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

  return new ApiExceptionWithKey(
    messageKey,
    HttpStatus.BAD_REQUEST,
    params,
  ) as BadRequestException;
}
