import { IsUUID } from 'class-validator';

export class AssignTierDto {
  @IsUUID(undefined, { message: 'TIERID_MUST_BE_UUID' })
  tierId: string;
}
