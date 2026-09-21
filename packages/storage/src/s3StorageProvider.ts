import * as crypto from 'crypto';
import type { S3StorageConfig, StorageProvider, UploadResult } from '@vidsnapai/types';

export class S3StorageProvider implements StorageProvider {
  public readonly providerName = 's3_compatible';
  private config: S3StorageConfig;

  constructor(config: S3StorageConfig) {
    if (!config.region || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new Error('[S3StorageProvider] Missing required S3 configuration (region, accessKeyId, secretAccessKey, bucket)');
    }
    this.config = {
      ...config,
      endpoint: config.endpoint || `https://s3.${config.region}.amazonaws.com`,
      forcePathStyle: config.forcePathStyle ?? (config.endpoint ? true : false),
    };
  }

  private sanitizeKey(key: string): string {
    let safeKey = key.replace(/\\/g, '/');
    safeKey = safeKey.replace(/(\.\.[/\\])+/g, '').replace(/^[/\\]+/, '');
    return safeKey;
  }

  private getHostAndUrl(key: string): { host: string; url: string; pathname: string } {
    const cleanKey = this.sanitizeKey(key);
    const endpointUrl = new URL(this.config.endpoint!);

    if (this.config.forcePathStyle) {
      const pathname = `/${this.config.bucket}/${cleanKey}`;
      const url = `${endpointUrl.origin}${pathname}`;
      return { host: endpointUrl.host, url, pathname };
    } else {
      const host = `${this.config.bucket}.${endpointUrl.host}`;
      const pathname = `/${cleanKey}`;
      const url = `${endpointUrl.protocol}//${host}${pathname}`;
      return { host, url, pathname };
    }
  }

  private hmac(key: Buffer | string, data: string | Buffer): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  private hash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private getSigningKey(dateStamp: string): Buffer {
    const kDate = this.hmac(`AWS4${this.config.secretAccessKey}`, dateStamp);
    const kRegion = this.hmac(kDate, this.config.region);
    const kService = this.hmac(kRegion, 's3');
    return this.hmac(kService, 'aws4_request');
  }

  private generateAuthHeaders(
    method: string,
    pathname: string,
    host: string,
    payloadHash: string,
    additionalHeaders: Record<string, string> = {},
    queryParams: Record<string, string> = {}
  ): Record<string, string> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...additionalHeaders,
    };

    const sortedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedHeaderKeys.map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`).join('');
    const signedHeaders = sortedHeaderKeys.map((k) => k.toLowerCase()).join(';');

    const sortedQueryKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedQueryKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalRequest = [
      method,
      pathname,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.hash(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...headers,
      Authorization: authHeader,
    };
  }

  async uploadBuffer(
    buffer: Buffer,
    key: string,
    mimeType: string,
    filename?: string
  ): Promise<UploadResult> {
    const cleanKey = this.sanitizeKey(key);
    const { host, url, pathname } = this.getHostAndUrl(cleanKey);
    const payloadHash = this.hash(buffer);

    const reqHeaders = this.generateAuthHeaders(
      'PUT',
      pathname,
      host,
      payloadHash,
      {
        'content-type': mimeType,
        'content-length': String(buffer.length),
      }
    );

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: reqHeaders,
        body: new Uint8Array(buffer),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[S3StorageProvider] S3 upload failed with status ${response.status}: ${errorText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`[S3StorageProvider] Failed to upload object to S3: ${message}`);
    }

    const publicUrl = this.config.publicBaseUrl
      ? `${this.config.publicBaseUrl.replace(/\/$/, '')}/${cleanKey}`
      : url;

    return {
      url: publicUrl,
      key: cleanKey,
      sizeBytes: buffer.length,
      mimeType,
      filename: filename || cleanKey.split('/').pop(),
    };
  }

  async getDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const cleanKey = this.sanitizeKey(key);

    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/$/, '')}/${cleanKey}`;
    }

    const { host, url, pathname } = this.getHostAndUrl(cleanKey);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresInSeconds),
      'X-Amz-SignedHeaders': 'host',
    };

    const sortedQueryKeys = Object.keys(queryParams).sort();
    const canonicalQueryString = sortedQueryKeys
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const canonicalRequest = [
      'GET',
      pathname,
      canonicalQueryString,
      canonicalHeaders,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.hash(canonicalRequest),
    ].join('\n');

    const signingKey = this.getSigningKey(dateStamp);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return `${url}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    const cleanKey = this.sanitizeKey(key);
    const { host, url, pathname } = this.getHostAndUrl(cleanKey);
    const payloadHash = this.hash('');

    const reqHeaders = this.generateAuthHeaders('DELETE', pathname, host, payloadHash);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: reqHeaders,
      });
      return response.ok || response.status === 204 || response.status === 404;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const cleanKey = this.sanitizeKey(key);
    const { host, url, pathname } = this.getHostAndUrl(cleanKey);
    const payloadHash = this.hash('');

    const reqHeaders = this.generateAuthHeaders('HEAD', pathname, host, payloadHash);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: reqHeaders,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
