import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../../../shared/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../../../../shared/decorators/current-user.decorator';
import { UploadService, MulterFile } from '../../../../../shared/services/upload';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import { ApiResponse, ApiResponseUtil } from '../../../../../shared/dto/api-response.dto';
import {
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

@Controller('api/editor')
@UseGuards(JwtAuthGuard)
export class EditorController {
  private readonly apiServiceUrl: string;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly maxFiles = 10;
  private readonly allowedTypes = /(jpg|jpeg|png|webp)$/i;

  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  @Post('upload-images')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('uploads', 10))
  async uploadImages(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFiles() files?: MulterFile[],
  ): Promise<ApiResponse<string[]>> {
    // Check if files are provided
    if (!files || files.length === 0) {
      throw badRequest(MessageKeys.FILE_REQUIRED);
    }

    // Check max files limit
    if (files.length > this.maxFiles) {
      throw badRequest(MessageKeys.MAX_FILES_EXCEEDED, {
        maxFiles: this.maxFiles.toString(),
      });
    }

    // Validate all files first (before uploading any)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > this.maxFileSize) {
        throw badRequest(MessageKeys.FILE_SIZE_EXCEEDS_LIMIT, {
          fileType: String('image'),
          maxSize: String('10MB'),
        });
      }

      // Check file type
      if (!this.allowedTypes.test(file.mimetype)) {
        throw badRequest(MessageKeys.INVALID_FILE_TYPE, {
          allowedTypes: String('jpg, jpeg, png, webp'),
        });
      }
    }

    // Upload all files
    const uploadedPaths: string[] = [];
    const uploadedRelativePaths: string[] = [];

    try {
      for (const file of files) {
        const uploadResult = await this.uploadService.uploadImage(file, {
          folder: 'content-images',
        });
        uploadedRelativePaths.push(uploadResult.relativePath);
        // Build full URL for response
        const fullUrl = buildFullUrl(this.apiServiceUrl, uploadResult.relativePath);
        if (fullUrl) {
          uploadedPaths.push(fullUrl);
        } else {
          uploadedPaths.push(uploadResult.relativePath);
        }
      }

      return ApiResponseUtil.success(uploadedPaths);
    } catch (error) {
      // Cleanup: Delete all uploaded files if any error occurs
      for (const relativePath of uploadedRelativePaths) {
        try {
          await this.uploadService.deleteFile(relativePath);
        } catch (deleteError) {
          // Log but don't throw - best effort cleanup
          console.error('Failed to cleanup uploaded file:', relativePath, deleteError);
        }
      }
      throw error;
    }
  }
}
