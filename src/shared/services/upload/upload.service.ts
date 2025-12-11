import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';
import { StorageProvider, STORAGE_PROVIDER } from './storage-provider.interface';
import { LoggerService } from '../../logger/logger.service';

// Multer file type (exported for reuse)
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadOptions {
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadResult {
  relativePath: string; // Relative path to save in database
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

@Injectable()
export class UploadService {
  private readonly maxFileSize: number;
  private readonly defaultQuality: number;

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    // Default: 5MB max file size
    this.maxFileSize =
      this.configService.get<number>('UPLOAD_MAX_FILE_SIZE') || 5 * 1024 * 1024;
    this.defaultQuality =
      this.configService.get<number>('UPLOAD_IMAGE_QUALITY') || 80;
  }

  /**
   * Upload and process avatar image
   * Converts to WebP format without resizing
   */
  async uploadAvatar(
    file: MulterFile,
    userId: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      this.validateFile(file);

      const { quality = this.defaultQuality } = options || {};

      // Process image: convert to WebP without resizing
      const processedBuffer = await this.convertToWebP(file.buffer, quality);

      // Generate short unique filename
      const filename = this.generateFilename('av', '.webp');

      // Save to storage with userId as subfolder: avatars/{userId}/
      const folder = `avatars/${userId}`;
      const relativePath = await this.storageProvider.save(
        processedBuffer,
        filename,
        folder,
      );

      return {
        relativePath,
        filename,
        originalName: file.originalname,
        size: processedBuffer.length,
        mimeType: 'image/webp',
      };
    } catch (error) {
      this.logger.error('Avatar upload failed', {
        userId,
        originalName: file?.originalname,
        error: (error as Error).message,
      }, 'upload');
      throw error;
    }
  }

  /**
   * Upload generic image
   */
  async uploadImage(
    file: MulterFile,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      this.validateFile(file);

      const {
        quality = this.defaultQuality,
        folder = 'images',
      } = options || {};

      // Process image: convert to WebP without resizing
      const processedBuffer = await this.convertToWebP(file.buffer, quality);

      // Generate short unique filename
      const filename = this.generateFilename('img', '.webp');

      // Save to storage
      const relativePath = await this.storageProvider.save(
        processedBuffer,
        filename,
        folder,
      );

      return {
        relativePath,
        filename,
        originalName: file.originalname,
        size: processedBuffer.length,
        mimeType: 'image/webp',
      };
    } catch (error) {
      this.logger.error('Image upload failed', {
        originalName: file?.originalname,
        error: (error as Error).message,
      }, 'upload');
      throw error;
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(relativePath: string): Promise<void> {
    await this.storageProvider.delete(relativePath);
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: MulterFile): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      );
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }
  }

  /**
   * Convert image to WebP format without resizing
   */
  private async convertToWebP(
    buffer: Buffer,
    quality: number,
  ): Promise<Buffer> {
    return sharp(buffer).webp({ quality }).toBuffer();
  }

  /**
   * Process image: resize and convert to WebP (kept for backward compatibility if needed)
   */
  private async processImage(
    buffer: Buffer,
    options: { maxWidth: number; maxHeight: number; quality: number },
  ): Promise<Buffer> {
    const { maxWidth, maxHeight, quality } = options;

    return sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  }

  /**
   * Generate short unique filename
   * Format: prefix_timestamp36_random6.ext (e.g., av_m5x7k2_a1b2c3.webp)
   */
  private generateFilename(prefix: string, extension: string): string {
    // Use base36 timestamp (shorter than decimal)
    const timestamp = Date.now().toString(36);
    // Use 6 random chars (enough for uniqueness)
    const random = crypto.randomBytes(3).toString('hex');
    return `${prefix}_${timestamp}_${random}${extension}`;
  }

  /**
   * Get current storage provider type
   */
  getStorageType(): string {
    return this.storageProvider.getType();
  }
}

