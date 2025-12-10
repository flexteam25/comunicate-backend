import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as crypto from 'crypto';
import * as path from 'path';
import { StorageProvider, STORAGE_PROVIDER } from './storage-provider.interface';

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
  url: string;
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
  private readonly apiServiceUrl: string;

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private configService: ConfigService,
  ) {
    // Default: 5MB max file size
    this.maxFileSize =
      this.configService.get<number>('UPLOAD_MAX_FILE_SIZE') || 5 * 1024 * 1024;
    this.defaultQuality =
      this.configService.get<number>('UPLOAD_IMAGE_QUALITY') || 80;
    // API service URL for full URL generation
    this.apiServiceUrl =
      this.configService.get<string>('API_SERVICE_URL') || '';
  }

  /**
   * Upload and process avatar image
   * Converts to WebP format and resizes if needed
   */
  async uploadAvatar(
    file: MulterFile,
    userId: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    this.validateFile(file);

    const { maxWidth = 400, maxHeight = 400, quality = this.defaultQuality } = options || {};

    // Process image: resize and convert to WebP
    const processedBuffer = await this.processImage(file.buffer, {
      maxWidth,
      maxHeight,
      quality,
    });

    // Generate short unique filename
    const filename = this.generateFilename('av', '.webp');

    // Save to storage with userId as subfolder: avatars/{userId}/
    const folder = `avatars/${userId}`;
    const relativePath = await this.storageProvider.save(
      processedBuffer,
      filename,
      folder,
    );

    // Build full URL with API_SERVICE_URL prefix
    const url = this.buildFullUrl(relativePath);

    return {
      url,
      filename,
      originalName: file.originalname,
      size: processedBuffer.length,
      mimeType: 'image/webp',
    };
  }

  /**
   * Upload generic image
   */
  async uploadImage(
    file: MulterFile,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    this.validateFile(file);

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = this.defaultQuality,
      folder = 'images',
    } = options || {};

    // Process image
    const processedBuffer = await this.processImage(file.buffer, {
      maxWidth,
      maxHeight,
      quality,
    });

    // Generate short unique filename
    const filename = this.generateFilename('img', '.webp');

    // Save to storage
    const relativePath = await this.storageProvider.save(
      processedBuffer,
      filename,
      folder,
    );

    // Build full URL with API_SERVICE_URL prefix
    const url = this.buildFullUrl(relativePath);

    return {
      url,
      filename,
      originalName: file.originalname,
      size: processedBuffer.length,
      mimeType: 'image/webp',
    };
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(url: string): Promise<void> {
    await this.storageProvider.delete(url);
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
   * Process image: resize and convert to WebP
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
   * Build full URL with API_SERVICE_URL prefix
   */
  private buildFullUrl(relativePath: string): string {
    if (!this.apiServiceUrl) {
      return relativePath;
    }
    // Remove trailing slash from apiServiceUrl and leading slash from relativePath
    const baseUrl = this.apiServiceUrl.replace(/\/$/, '');
    const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${baseUrl}${path}`;
  }

  /**
   * Get current storage provider type
   */
  getStorageType(): string {
    return this.storageProvider.getType();
  }
}

