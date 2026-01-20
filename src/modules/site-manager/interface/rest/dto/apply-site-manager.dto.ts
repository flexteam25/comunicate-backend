import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class ApplySiteManagerDto {
  @IsNotEmpty({ message: 'DOMAIN_REQUIRED' })
  @IsString({ message: 'DOMAIN_MUST_BE_STRING' })
  @MaxLength(255, { message: 'DOMAIN_MAX_LENGTH' })
  domain: string;

  @IsNotEmpty({ message: 'ACCOUNT_ID_REQUIRED' })
  @IsString({ message: 'ACCOUNT_ID_MUST_BE_STRING' })
  @MaxLength(255, { message: 'ACCOUNT_ID_MAX_LENGTH' })
  accountId: string;

  @IsNotEmpty({ message: 'ACCOUNT_PASSWORD_REQUIRED' })
  @IsString({ message: 'ACCOUNT_PASSWORD_MUST_BE_STRING' })
  @MaxLength(255, { message: 'ACCOUNT_PASSWORD_MAX_LENGTH' })
  accountPassword: string;

  @IsOptional()
  @IsString({ message: 'MESSAGE_MUST_BE_STRING' })
  @MaxLength(5000, { message: 'MESSAGE_MAX_LENGTH' })
  message?: string;
}
