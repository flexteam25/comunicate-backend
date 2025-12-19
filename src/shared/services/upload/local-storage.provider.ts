import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider } from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || 'uploads';
    this.baseUrl = this.configService.get<string>('UPLOAD_BASE_URL') || '/uploads';
  }

  async save(buffer: Buffer, filename: string, folder?: string): Promise<string> {
    const targetDir = folder ? path.join(this.uploadDir, folder) : this.uploadDir;

    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, buffer);

    // Return URL path
    const urlPath = folder
      ? `${this.baseUrl}/${folder}/${filename}`
      : `${this.baseUrl}/${filename}`;

    return urlPath;
  }

  async delete(filePath: string): Promise<void> {
    // Convert URL path to file system path
    const relativePath = filePath.replace(this.baseUrl, '');
    const fullPath = path.join(this.uploadDir, relativePath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const relativePath = filePath.replace(this.baseUrl, '');
    const fullPath = path.join(this.uploadDir, relativePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getType(): string {
    return 'local';
  }
}
