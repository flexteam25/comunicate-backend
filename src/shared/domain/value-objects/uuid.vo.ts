import { v4 as uuidv4 } from 'uuid';

export class Uuid {
  private readonly value: string;

  constructor(value?: string) {
    this.value = value || uuidv4();
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: Uuid): boolean {
    return this.value === other.value;
  }

  public static generate(): Uuid {
    return new Uuid();
  }
}
