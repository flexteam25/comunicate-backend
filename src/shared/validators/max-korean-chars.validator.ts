import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string has maximum N Korean characters.
 * Korean characters are in the Unicode range \uAC00-\uD7A3 (Hangul syllables).
 */
@ValidatorConstraint({ async: false })
export class MaxKoreanCharsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (value === undefined || value === null || value === '') {
      return true; // Allow optional values
    }
    if (typeof value !== 'string') {
      return false;
    }
    const maxChars = args.constraints[0] as number;
    // Korean characters range: \uAC00-\uD7A3 (Hangul syllables)
    const koreanCharRegex = /[\uAC00-\uD7A3]/g;
    const koreanChars = value.match(koreanCharRegex);
    const koreanCharCount = koreanChars ? koreanChars.length : 0;
    return koreanCharCount <= maxChars;
  }

  defaultMessage(args: ValidationArguments) {
    const maxChars = args.constraints[0] as number;
    return `${args.property} must have at most ${maxChars} Korean character(s)`;
  }
}

/**
 * Decorator to validate maximum Korean characters
 * @param maxChars Maximum number of Korean characters allowed
 * @param validationOptions Optional validation options
 */
export function MaxKoreanChars(maxChars: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [maxChars],
      validator: MaxKoreanCharsConstraint,
    });
  };
}
