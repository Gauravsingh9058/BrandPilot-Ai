import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface DownloadMediaResult {
  success: boolean;
  localPath?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
}

export class MediaAssetDownloader {
  /**
   * Resolves a media source URL (remote HTTP, local /api/storage/files/, or absolute/relative disk path)
   * into a validated local file path.
   */
  static async resolveAndDownload(
    sourceUrl: string,
    targetDir: string,
    prefix: string = 'media'
  ): Promise<DownloadMediaResult> {
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      return { success: false, error: 'Empty or invalid media source URL' };
    }

    const trimmed = sourceUrl.trim();

    // Case 1: Remote HTTP/HTTPS URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return this.downloadRemoteFile(trimmed, targetDir, prefix);
    }

    // Case 2: Local storage file URL (/api/storage/files/<key>)
    if (trimmed.startsWith('/api/storage/files/')) {
      const storageKey = trimmed.replace('/api/storage/files/', '');
      const candidatePaths = [
        path.resolve(process.cwd(), 'uploads', storageKey),
        path.resolve(process.cwd(), 'apps/api/uploads', storageKey),
        path.resolve(process.cwd(), 'apps/worker/uploads', storageKey)
      ];

      for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate)) {
          const stats = await fs.promises.stat(candidate);
          if (stats.size > 0) {
            return {
              success: true,
              localPath: candidate,
              sizeBytes: stats.size
            };
          }
        }
      }

      return {
        success: false,
        error: `Local storage file for key "${storageKey}" not found on disk.`
      };
    }

    // Case 3: Direct local filesystem path
    const directCandidate = path.isAbsolute(trimmed)
      ? trimmed
      : path.resolve(process.cwd(), trimmed);

    if (fs.existsSync(directCandidate)) {
      const stats = await fs.promises.stat(directCandidate);
      if (stats.size > 0) {
        return {
          success: true,
          localPath: directCandidate,
          sizeBytes: stats.size
        };
      }
    }

    return {
      success: false,
      error: `Could not resolve media source "${trimmed}" to a local file.`
    };
  }

  /**
   * Downloads a remote HTTP or HTTPS file into a target directory.
   */
  private static downloadRemoteFile(
    remoteUrl: string,
    targetDir: string,
    prefix: string,
    maxRedirects = 5,
    timeoutMs = 30000
  ): Promise<DownloadMediaResult> {
    return new Promise((resolve) => {
      let redirectsCount = 0;

      const attemptDownload = (currentUrl: string) => {
        try {
          const parsed = new URL(currentUrl);
          const client = parsed.protocol === 'https:' ? https : http;

          // Determine file extension
          const urlExt = path.extname(parsed.pathname) || '.mp4';
          const localFilename = `${prefix}_${Date.now()}${urlExt}`;
          const localFilePath = path.join(targetDir, localFilename);

          const req = client.get(
            currentUrl,
            {
              headers: {
                'User-Agent': 'VidSnapAI-RenderEngine/1.0',
                Accept: '*/*'
              },
              timeout: timeoutMs
            },
            (res) => {
              // Handle redirects
              if (
                res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
              ) {
                redirectsCount++;
                if (redirectsCount > maxRedirects) {
                  resolve({
                    success: false,
                    error: `Too many redirects (${redirectsCount}) downloading ${remoteUrl}`
                  });
                  return;
                }
                const redirectUrl = new URL(res.headers.location, currentUrl).toString();
                attemptDownload(redirectUrl);
                return;
              }

              if (res.statusCode !== 200) {
                resolve({
                  success: false,
                  error: `HTTP ${res.statusCode} when fetching media from ${remoteUrl}`
                });
                return;
              }

              const mimeType = res.headers['content-type'] || '';
              const fileStream = fs.createWriteStream(localFilePath);

              res.pipe(fileStream);

              fileStream.on('finish', () => {
                fileStream.close(async () => {
                  try {
                    const stats = await fs.promises.stat(localFilePath);
                    if (stats.size === 0) {
                      try {
                        await fs.promises.unlink(localFilePath);
                      } catch {
                        // ignore cleanup error
                      }
                      resolve({
                        success: false,
                        error: `Downloaded file from ${remoteUrl} has 0 bytes`
                      });
                      return;
                    }

                    resolve({
                      success: true,
                      localPath: localFilePath,
                      mimeType,
                      sizeBytes: stats.size
                    });
                  } catch (err: any) {
                    resolve({
                      success: false,
                      error: `Failed to inspect downloaded file: ${err.message}`
                    });
                  }
                });
              });

              fileStream.on('error', (err) => {
                try {
                  fs.unlinkSync(localFilePath);
                } catch {
                  // ignore cleanup error
                }
                resolve({
                  success: false,
                  error: `File write error downloading ${remoteUrl}: ${err.message}`
                });
              });
            }
          );

          req.on('timeout', () => {
            req.destroy();
            resolve({
              success: false,
              error: `Timeout downloading media from ${remoteUrl} after ${timeoutMs}ms`
            });
          });

          req.on('error', (err) => {
            resolve({
              success: false,
              error: `Network error downloading media from ${remoteUrl}: ${err.message}`
            });
          });
        } catch (err: any) {
          resolve({
            success: false,
            error: `Invalid URL or download initialization error: ${err.message}`
          });
        }
      };

      attemptDownload(remoteUrl);
    });
  }
}
