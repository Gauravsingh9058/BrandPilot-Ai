import * as fs from 'fs';
import * as path from 'path';
import type { StorageProvider, UploadResult } from '@vidsnapai/types';
import { S3StorageProvider } from './s3StorageProvider.js';

export * from '@vidsnapai/types';

export interface LocalStorageConfig {
  baseDir: string;
  publicUrlPrefix?: string;
}

export class LocalStorageProvider implements StorageProvider {
  public readonly providerName = 'local_filesystem';
  private baseDir: string;
  private publicUrlPrefix: string;

  constructor(config?: Partial<LocalStorageConfig>) {
    this.baseDir = config?.baseDir || path.resolve(process.cwd(), 'uploads');
    this.publicUrlPrefix = config?.publicUrlPrefix || '/api/storage/files';
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {
      // Ignore directory creation error if already exists in race conditions
    }
  }

  private sanitizeKey(key: string): string {
    // Prevent path traversal
    let safeKey = key.replace(/\\/g, '/');
    if (safeKey.includes('..') || /^[a-zA-Z]:/.test(safeKey) || safeKey.startsWith('/etc') || safeKey.startsWith('/var')) {
      throw new Error(`[Storage Security] Path traversal blocked for key: "${key}"`);
    }
    safeKey = safeKey.replace(/(\.\.[/\\])+/g, '').replace(/^[/\\]+/, '');
    return safeKey;
  }

  private getVerifiedPath(key: string): string {
    const cleanKey = this.sanitizeKey(key);
    const resolvedBase = path.resolve(this.baseDir);
    const resolvedPath = path.resolve(resolvedBase, cleanKey);

    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error(`[Storage Security] Key escapes base directory: "${key}"`);
    }
    return resolvedPath;
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    mimeType: string,
    filename?: string
  ): Promise<UploadResult> {
    const targetPath = this.getVerifiedPath(key);
    const cleanKey = this.sanitizeKey(key);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);

    const normalizedKey = cleanKey.replace(/\\/g, '/');
    const url = `${this.publicUrlPrefix}/${normalizedKey}`;

    return {
      url,
      key: normalizedKey,
      sizeBytes: buffer.length,
      mimeType,
      filename: filename || path.basename(cleanKey)
    };
  }

  async getDownloadUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    const cleanKey = this.sanitizeKey(key).replace(/\\/g, '/');
    return `${this.publicUrlPrefix}/${cleanKey}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    const targetPath = this.getVerifiedPath(key);

    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
      return true;
    }
    return false;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const targetPath = this.getVerifiedPath(key);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }

  getFilePath(key: string): string {
    return this.getVerifiedPath(key);
  }
}

/**
 * In-Memory Storage Provider for unit testing and ephemeral environments
 */
export class MemoryStorageProvider implements StorageProvider {
  public readonly providerName = 'in_memory';
  private files = new Map<string, { buffer: Buffer; mimeType: string; filename?: string }>();
  private publicUrlPrefix: string;

  constructor(publicUrlPrefix = '/api/storage/files') {
    this.publicUrlPrefix = publicUrlPrefix;
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    mimeType: string,
    filename?: string
  ): Promise<UploadResult> {
    const cleanKey = key.replace(/\\/g, '/');
    this.files.set(cleanKey, { buffer, mimeType, filename });

    return {
      url: `${this.publicUrlPrefix}/${cleanKey}`,
      key: cleanKey,
      sizeBytes: buffer.length,
      mimeType,
      filename: filename || cleanKey.split('/').pop()
    };
  }

  async getDownloadUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    const cleanKey = key.replace(/\\/g, '/');
    return `${this.publicUrlPrefix}/${cleanKey}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    const cleanKey = key.replace(/\\/g, '/');
    return this.files.delete(cleanKey);
  }

  async exists(key: string): Promise<boolean> {
    const cleanKey = key.replace(/\\/g, '/');
    return this.files.has(cleanKey);
  }

  getBuffer(key: string): Buffer | null {
    const cleanKey = key.replace(/\\/g, '/');
    return this.files.get(cleanKey)?.buffer || null;
  }
}

export * from './s3StorageProvider.js';

export interface StorageFactoryOptions {
  type?: 'local' | 'memory' | 's3';
  s3Config?: import('@vidsnapai/types').S3StorageConfig;
  localConfig?: Partial<LocalStorageConfig>;
  publicUrlPrefix?: string;
}

export function createStorageProvider(options: StorageFactoryOptions = {}): StorageProvider {
  const type = options.type || (process.env.STORAGE_PROVIDER as 'local' | 'memory' | 's3') || 'local';

  if (type === 's3') {
    const config = options.s3Config || {
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      bucket: process.env.S3_BUCKET || 'vidsnapai-media',
      endpoint: process.env.S3_ENDPOINT,
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    };
    return new S3StorageProvider(config);
  }

  if (type === 'memory') {
    return new MemoryStorageProvider(options.publicUrlPrefix);
  }

  return new LocalStorageProvider(options.localConfig);
}
