import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsDate,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToBoolean } from '../../../../../shared/utils/transform-boolean.util';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone is required' })
  @MaxLength(20)
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @MaxLength(10)
  otp: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @IsOptional()
  @TransformToBoolean
  @IsBoolean()
  partner?: boolean;
}
