import { IsObject, IsOptional } from 'class-validator';

export class UpdateSystemSettingValueDto {
  @IsObject()
  value: Record<string, unknown>;

  @IsOptional()
  _comment?: string;
}
