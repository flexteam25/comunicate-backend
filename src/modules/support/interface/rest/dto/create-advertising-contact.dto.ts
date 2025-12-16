import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateAdvertisingContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
