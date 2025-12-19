import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER, StorageProvider } from './storage-provider.interface';

export type StorageType = 'local' | 's3';

export interface UploadModuleOptions {
  storageType?: StorageType;
}

@Module({})
export class UploadModule {
  /**
   * Register upload module with default local storage
   */
  static register(options?: UploadModuleOptions): DynamicModule {
    const storageType = options?.storageType || 'local';

    const storageProvider: Provider = {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService): StorageProvider => {
        // Can be extended to support S3 in the future
        const type = configService.get<string>('UPLOAD_STORAGE_TYPE') || storageType;

        switch (type) {
          case 's3':
            // TODO: Implement S3 storage provider
            throw new Error('S3 storage provider not implemented yet');
          case 'local':
          default:
            return new LocalStorageProvider(configService);
        }
      },
      inject: [ConfigService],
    };

    return {
      module: UploadModule,
      imports: [ConfigModule],
      providers: [storageProvider, UploadService, LocalStorageProvider],
      exports: [UploadService, STORAGE_PROVIDER],
    };
  }

  /**
   * Register upload module with async configuration
   */
  static registerAsync(): DynamicModule {
    const storageProvider: Provider = {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService): StorageProvider => {
        const type = configService.get<string>('UPLOAD_STORAGE_TYPE') || 'local';

        switch (type) {
          case 's3':
            // TODO: Implement S3 storage provider
            throw new Error('S3 storage provider not implemented yet');
          case 'local':
          default:
            return new LocalStorageProvider(configService);
        }
      },
      inject: [ConfigService],
    };

    return {
      module: UploadModule,
      imports: [ConfigModule],
      providers: [storageProvider, UploadService, LocalStorageProvider],
      exports: [UploadService, STORAGE_PROVIDER],
    };
  }
}
