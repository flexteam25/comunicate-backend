import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePointSettingDto {
  @IsOptional({ message: 'POINT_OPTIONAL' })
  @IsInt({ message: 'POINTS_MUST_BE_INTEGER' })
  point?: number;

  @IsOptional({ message: 'NAME_OPTIONAL' })
  @IsString({ message: 'NAME_MUST_BE_STRING' })
  @MaxLength(255, { message: 'NAME_MAX_LENGTH' })
  name?: string;

  @IsOptional({ message: 'NAMEKO_OPTIONAL' })
  @IsString({ message: 'NAMEKO_MUST_BE_STRING' })
  @MaxLength(255, { message: 'NAMEKO_MAX_LENGTH' })
  nameKo?: string;
}
