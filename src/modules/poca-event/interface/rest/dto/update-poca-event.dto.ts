import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';

export class UpdatePocaEventDto {
  @IsOptional({ message: 'TITLE_OPTIONAL' })
  @IsString({ message: 'TITLE_MUST_BE_STRING' })
  @MaxLength(255, { message: 'TITLE_MAX_LENGTH' })
  title?: string;

  @IsOptional({ message: 'SLUG_OPTIONAL' })
  @IsString({ message: 'SLUG_MUST_BE_STRING' })
  @MaxLength(255, { message: 'SLUG_MAX_LENGTH' })
  slug?: string;

  @IsOptional({ message: 'SUMMARY_OPTIONAL' })
  @IsString({ message: 'SUMMARY_MUST_BE_STRING' })
  @MaxLength(500, { message: 'SUMMARY_MAX_LENGTH' })
  summary?: string;

  @IsOptional({ message: 'CONTENT_OPTIONAL' })
  @IsString({ message: 'CONTENT_MUST_BE_STRING' })
  content?: string;

  @IsOptional({ message: 'STATUS_OPTIONAL' })
  @IsEnum(PocaEventStatus, {
    message: 'Status must be one of: draft, published, archived',
  })
  status?: PocaEventStatus;

  @IsOptional({ message: 'STARTSAT_OPTIONAL' })
  @IsDateString({}, { message: 'STARTSAT_MUST_BE_DATE_STRING' })
  startsAt?: string;

  @IsOptional({ message: 'ENDSAT_OPTIONAL' })
  @IsDateString({}, { message: 'ENDSAT_MUST_BE_DATE_STRING' })
  endsAt?: string;

  @IsOptional({ message: 'BANNERSORDER_OPTIONAL' })
  @IsString({ message: 'BANNERSORDER_MUST_BE_STRING' })
  bannersOrder?: string; // JSON string array of numbers: "[0, 1, 2]"

  @IsOptional({ message: 'DELETEPRIMARYBANNER_OPTIONAL' })
  @IsString({ message: 'DELETEPRIMARYBANNER_MUST_BE_STRING' })
  deletePrimaryBanner?: string; // "true" to delete primary banner

  @IsOptional({ message: 'DELETEBANNERS_OPTIONAL' })
  @IsString({ message: 'DELETEBANNERS_MUST_BE_STRING' })
  deleteBanners?: string; // "true" to delete all banners
}
