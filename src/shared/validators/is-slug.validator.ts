import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string is a valid slug format:
 * - Only lowercase letters, numbers, and hyphens
 * - Examples: my-site-123, winwin, lula-88
 */
@ValidatorConstraint({ async: false })
export class IsSlugConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (typeof value !== 'string') {
      return false;
    }
    // Only lowercase alphanumeric and hyphens, at least 1 character
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid slug (only lowercase letters, numbers, and hyphens allowed)`;
  }
}

/**
 * Decorator to validate slug format
 * @param validationOptions Optional validation options
 */
export function IsSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSlugConstraint,
    });
  };
}
