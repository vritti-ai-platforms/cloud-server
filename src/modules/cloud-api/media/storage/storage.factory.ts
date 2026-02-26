import { Injectable } from '@nestjs/common';
import { R2StorageProvider } from './r2-storage.provider';
import type { StorageProvider } from './storage-provider.interface';

@Injectable()
export class StorageFactory {
  constructor(private readonly r2Provider: R2StorageProvider) {}

  // Resolves the storage provider by name
  resolve(provider: string): StorageProvider {
    switch (provider) {
      case 'r2':
        return this.r2Provider;
      default:
        throw new Error(`Unsupported storage provider: ${provider}`);
    }
  }
}
