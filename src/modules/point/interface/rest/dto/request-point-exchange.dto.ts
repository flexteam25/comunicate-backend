import { IsUUID, IsInt, Min, IsString, IsNotEmpty } from 'class-validator';

export class RequestPointExchangeDto {
  @IsUUID(undefined, { message: 'SITEID_MUST_BE_UUID' })
  @IsNotEmpty({ message: 'SITEID_REQUIRED' })
  siteId: string;

  @IsInt({ message: 'POINTSAMOUNT_MUST_BE_INTEGER' })
  @Min(10000, { message: 'POINTSAMOUNT_MIN_VALUE' })
  pointsAmount: number;

  @IsString({ message: 'SITEUSERID_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'SITEUSERID_REQUIRED' })
  siteUserId: string;
}
