import { IsUUID } from 'class-validator';

export class AssignTierDto {
  @IsUUID()
  tierId: string;
}

