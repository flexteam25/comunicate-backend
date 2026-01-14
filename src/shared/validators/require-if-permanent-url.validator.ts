import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class RequireIfPermanentUrlConstraint implements ValidatorConstraintInterface {
  validate(accessibleUrl: any, args: ValidationArguments) {
    const object = args.object as any;
    const permanentUrl = object.permanentUrl;

    // If permanentUrl is provided and not empty, accessibleUrl is required
    if (permanentUrl && permanentUrl.trim() !== '') {
      return accessibleUrl !== undefined && accessibleUrl !== null && accessibleUrl.trim() !== '';
    }

    // If permanentUrl is not provided, accessibleUrl is optional
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'ACCESSIBLE_URL_REQUIRED_IF_PERMANENT_URL_PROVIDED';
  }
}

/**
 * Decorator to require accessibleUrl when permanentUrl is provided
 * @param validationOptions Optional validation options
 */
export function RequireIfPermanentUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: RequireIfPermanentUrlConstraint,
    });
  };
}
