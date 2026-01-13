import { IsString } from 'class-validator';

export class AdminRefreshTokenDto {
  @IsString({ message: 'REFRESHTOKEN_MUST_BE_STRING' })
  refreshToken: string;
}
