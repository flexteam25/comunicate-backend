import { IsUUID, IsInt, Min, IsString, IsNotEmpty } from 'class-validator';

export class RequestPointExchangeDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Site ID is required' })
  siteId: string;

  @IsInt({ message: 'Points amount must be an integer' })
  @Min(10000, { message: 'Minimum exchange amount is 10,000 points' })
  pointsAmount: number;

  @IsString()
  @IsNotEmpty({ message: 'Site user ID is required' })
  siteUserId: string;
}
