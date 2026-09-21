export * from '@vidsnapai/types';
export * from './mediaValidator.js';
export * from './productionAssetValidator.js';
export * from './assetResolver.js';
export * from './assetIntelligenceService.js';
export * from './veoReferenceAssetResolver.js';
export * from './mediaService.js';
export * from './repositories/reel-asset.repository.js';

import type {
  MediaProvider,
  MediaSearchQuery,
  MediaSearchResult,
  MediaAsset
} from '@vidsnapai/types';

export interface PexelsProviderConfig {
  apiKey: string;
}

export class PexelsProvider implements MediaProvider {
  public readonly providerName = 'pexels';
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com';

  constructor(config: PexelsProviderConfig) {
    this.apiKey = config.apiKey;
  }

  private getHeaders(): HeadersInit {
    if (!this.apiKey) {
      throw new Error(
        '[PexelsProvider] PEXELS_API_KEY is not configured. Please set PEXELS_API_KEY in your environment.'
      );
    }
    return {
      Authorization: this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  private async fetchWithRetry(url: string, timeoutMs = 15000, maxRetries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: this.getHeaders(),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (response.status === 429 || response.status >= 500) {
          if (attempt < maxRetries) {
            const delay = Math.min(500 * Math.pow(2, attempt) + Math.random() * 200, 3000);
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }
        }

        return response;
      } catch (err: unknown) {
        clearTimeout(timer);
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delay = Math.min(500 * Math.pow(2, attempt) + Math.random() * 200, 3000);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
      }
    }

    throw lastError || new Error('Pexels API request failed after retries');
  }

  async searchVideos(params: MediaSearchQuery): Promise<MediaSearchResult> {
    const url = new URL(`${this.baseUrl}/videos/search`);
    url.searchParams.set('query', params.query);
    url.searchParams.set('per_page', String(params.perPage || 15));
    url.searchParams.set('page', String(params.page || 1));
    if (params.orientation) {
      url.searchParams.set('orientation', params.orientation);
    }

    try {
      const response = await this.fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        videos: Array<{
          id: number;
          width: number;
          height: number;
          duration: number;
          url: string;
          image: string;
          user: { name: string; url: string };
          video_files: Array<{ link: string; width: number; height: number; quality: string }>;
        }>;
        total_results: number;
        page: number;
        per_page: number;
      };

      const assets: MediaAsset[] = (data.videos || []).map((video) => {
        const bestFile = video.video_files?.[0];
        return {
          id: String(video.id),
          provider: 'pexels',
          type: 'video',
          url: bestFile?.link || video.url,
          previewUrl: video.image,
          width: video.width,
          height: video.height,
          durationSeconds: video.duration,
          photographer: video.user?.name,
          photographerUrl: video.user?.url
        };
      });

      return {
        assets,
        totalResults: data.total_results || 0,
        page: data.page || 1,
        perPage: data.per_page || 15
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[PexelsProvider] searchVideos failed: ${message}`);
    }
  }

  async searchImages(params: MediaSearchQuery): Promise<MediaSearchResult> {
    const url = new URL(`${this.baseUrl}/v1/search`);
    url.searchParams.set('query', params.query);
    url.searchParams.set('per_page', String(params.perPage || 15));
    url.searchParams.set('page', String(params.page || 1));
    if (params.orientation) {
      url.searchParams.set('orientation', params.orientation);
    }

    try {
      const response = await this.fetchWithRetry(url.toString());

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        photos: Array<{
          id: number;
          width: number;
          height: number;
          url: string;
          photographer: string;
          photographer_url: string;
          src: { large2x: string; large: string; medium: string; small: string; original: string };
          alt: string;
        }>;
        total_results: number;
        page: number;
        per_page: number;
      };

      const assets: MediaAsset[] = (data.photos || []).map((photo) => ({
        id: String(photo.id),
        provider: 'pexels',
        type: 'image',
        title: photo.alt,
        url: photo.src?.original || photo.src?.large2x || photo.url,
        previewUrl: photo.src?.medium || photo.src?.small,
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url
      }));

      return {
        assets,
        totalResults: data.total_results || 0,
        page: data.page || 1,
        perPage: data.per_page || 15
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[PexelsProvider] searchImages failed: ${message}`);
    }
  }

  async getAssetById(_id: string): Promise<MediaAsset | null> {
    return null;
  }
}
