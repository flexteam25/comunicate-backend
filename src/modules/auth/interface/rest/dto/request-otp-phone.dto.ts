import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class RequestOtpPhoneDto {
  @IsString({ message: 'Phone must be a string' })
  @IsNotEmpty({ message: 'Phone is required' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in valid format (e.g., +84123456789)',
  })
  phone: string;
}
