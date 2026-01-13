import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'REFRESHTOKEN_MUST_BE_STRING' })
  refreshToken: string;
}
