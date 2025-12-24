import { Transform } from 'class-transformer';

export const transformToBoolean = ({ value }: { value: any }): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true' || value === '1') {
      return true;
    }
    if (value.toLowerCase() === 'false' || value === '0') {
      return false;
    }
  }
  return value as boolean;
};

export const TransformToBoolean = Transform(transformToBoolean);
