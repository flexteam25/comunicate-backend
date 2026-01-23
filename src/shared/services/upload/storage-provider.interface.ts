/**
 * Storage Provider Interface
 * Allows switching between local storage and cloud storage (S3, etc.)
 */
export interface StorageProvider {
  /**
   * Save file to storage
   * @param buffer File buffer
   * @param filename Filename to save as
   * @param folder Optional folder/prefix
   * @returns URL or path to the saved file
   */
  save(buffer: Buffer, filename: string, folder?: string): Promise<string>;

  /**
   * Delete file from storage
   * @param path File path or URL
   */
  delete(path: string): Promise<void>;

  /**
   * Check if file exists
   * @param path File path or URL
   */
  exists(path: string): Promise<boolean>;

  /**
   * Move file from source path to destination path
   * @param sourcePath Source file path or URL
   * @param destPath Destination file path or URL
   */
  move(sourcePath: string, destPath: string): Promise<string>;

  /**
   * Get the storage type identifier
   */
  getType(): string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
