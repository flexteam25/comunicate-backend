import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UnblockGlobalIpDto {
  @IsString({ message: 'IP_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'IP_REQUIRED' })
  @Matches(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
    {
      message: 'IP_INVALID_FORMAT',
    },
  )
  ip: string;
}
