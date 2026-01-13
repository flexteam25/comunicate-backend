import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'TOKEN_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'TOKEN_REQUIRED' })
  token: string;

  @IsString({ message: 'NEWPASSWORD_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'NEWPASSWORD_REQUIRED' })
  @MinLength(8, { message: 'NEWPASSWORD_MIN_LENGTH' })
  newPassword: string;

  @IsString({ message: 'PASSWORDCONFIRMATION_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'PASSWORDCONFIRMATION_REQUIRED' })
  passwordConfirmation: string;
}
