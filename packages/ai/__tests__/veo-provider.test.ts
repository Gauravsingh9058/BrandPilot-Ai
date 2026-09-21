import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VeoProvider,
  createVeoProvider,
  normalizeVeoModel,
  DEFAULT_VEO_MODEL,
  VeoQuotaExhaustedError,
  VeoAuthError,
  VeoModelNotFoundError,
  VeoOperationFailedError,
  VeoTimeoutError,
  VeoOutputDownloadError,
  aiProviderStateManager
} from '../src/index.js';

describe('Google Veo 3.1 AI Video Generation Provider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    aiProviderStateManager.resetAll();
    process.env.GEMINI_API_KEY = 'test-gemini-key-12345';
    process.env.VEO_MODEL = 'veo-3.1-generate-preview';
    process.env.VEO_ENABLED = 'true';
    process.env.VEO_DEFAULT_RESOLUTION = '720p';
    process.env.VEO_DEFAULT_ASPECT_RATIO = '9:16';
    process.env.VEO_DEFAULT_DURATION = '8';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('1. Model Normalization & Configuration', () => {
    it('defaults to veo-3.1-generate-preview when no model is specified', () => {
      expect(normalizeVeoModel()).toBe(DEFAULT_VEO_MODEL);
      expect(normalizeVeoModel('')).toBe(DEFAULT_VEO_MODEL);
      expect(normalizeVeoModel('   ')).toBe(DEFAULT_VEO_MODEL);
    });

    it('rejects obsolete Veo 2 / Gemini 2 models and normalizes to Veo 3.1 preview', () => {
      expect(normalizeVeoModel('veo-2')).toBe(DEFAULT_VEO_MODEL);
      expect(normalizeVeoModel('veo-2.0')).toBe(DEFAULT_VEO_MODEL);
      expect(normalizeVeoModel('veo-2.0-generate-001')).toBe(DEFAULT_VEO_MODEL);
      expect(normalizeVeoModel('gemini-2.0-flash')).toBe(DEFAULT_VEO_MODEL);
      expect(normalizeVeoModel('veo')).toBe(DEFAULT_VEO_MODEL);
    });

    it('preserves valid custom Veo 3.1 model identifiers', () => {
      expect(normalizeVeoModel('veo-3.1-generate-preview')).toBe('veo-3.1-generate-preview');
      expect(normalizeVeoModel('veo-3.1-generate-001')).toBe('veo-3.1-generate-001');
    });

    it('honors feature flags and API key check in isVeoEnabled', () => {
      const provider = new VeoProvider({ apiKey: 'valid-key', enabled: true });
      expect(provider.isVeoEnabled()).toBe(true);

      const disabledProvider = new VeoProvider({ apiKey: 'valid-key', enabled: false });
      expect(disabledProvider.isVeoEnabled()).toBe(false);

      const noKeyProvider = new VeoProvider({ apiKey: '', enabled: true });
      expect(noKeyProvider.isVeoEnabled()).toBe(false);
    });
  });

  describe('2. Text-to-Video Generation', () => {
    it('submits text prompt and returns asynchronous operation with 9:16 portrait parameters', async () => {
      const mockGenerateVideos = vi.fn().mockResolvedValue({
        name: 'operations/veo-test-op-101',
        done: false,
        metadata: { createTime: '2026-09-21T00:00:00Z' }
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      const result = await provider.generateVideo({
        prompt: 'Cinematic slow motion shot of luxury sneaker rotating on obsidian pedestal with golden backlighting',
        aspectRatio: '9:16',
        durationSeconds: 8,
        resolution: '720p',
        fps: 24,
        generateAudio: true
      });

      expect(mockGenerateVideos).toHaveBeenCalledWith({
        model: 'veo-3.1-generate-preview',
        prompt: 'Cinematic slow motion shot of luxury sneaker rotating on obsidian pedestal with golden backlighting',
        config: {
          aspectRatio: '9:16',
          durationSeconds: 8,
          resolution: '720p',
          numberOfVideos: 1,
          fps: 24,
          generateAudio: true
        }
      });

      expect(result.operationId).toBe('operations/veo-test-op-101');
      expect(result.status).toBe('POLLING');
      expect(result.done).toBe(false);
      expect(result.provider).toBe('google-veo');
      expect(result.model).toBe('veo-3.1-generate-preview');
    });
  });

  describe('3. Image-to-Video & Frame Interpolation', () => {
    it('submits image-to-video request with first frame and optional last frame interpolation', async () => {
      const mockGenerateVideos = vi.fn().mockResolvedValue({
        name: 'operations/veo-img-op-202',
        done: false
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      const result = await provider.generateImageToVideo({
        prompt: 'Camera zooms dynamically into product label with cinematic lighting',
        image: {
          imageBytes: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mimeType: 'image/png'
        },
        lastFrame: {
          imageBytes: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          mimeType: 'image/png'
        },
        aspectRatio: '9:16',
        durationSeconds: 6,
        resolution: '720p'
      });

      expect(mockGenerateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'veo-3.1-generate-preview',
          image: {
            imageBytes: expect.any(String),
            mimeType: 'image/png'
          },
          config: expect.objectContaining({
            aspectRatio: '9:16',
            durationSeconds: 6,
            lastFrame: {
              imageBytes: expect.any(String),
              mimeType: 'image/png'
            }
          })
        })
      );

      expect(result.operationId).toBe('operations/veo-img-op-202');
      expect(result.done).toBe(false);
    });
  });

  describe('4. Product Reference-Image Generation', () => {
    it('passes multiple product reference images with reference types', async () => {
      const mockGenerateVideos = vi.fn().mockResolvedValue({
        name: 'operations/veo-ref-op-303',
        done: false
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      const result = await provider.generateReferenceVideo({
        prompt: 'High-energy commercial showcase of product in urban city environment',
        referenceImages: [
          {
            image: { uri: 'gs://vidsnapai-assets/product-hero.png', mimeType: 'image/png' },
            referenceType: 'REFERENCE_TYPE_SUBJECT'
          },
          {
            image: { uri: 'gs://vidsnapai-assets/brand-style.png', mimeType: 'image/png' },
            referenceType: 'REFERENCE_TYPE_STYLE'
          }
        ],
        aspectRatio: '9:16',
        durationSeconds: 8,
        resolution: '720p'
      });

      expect(mockGenerateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'veo-3.1-generate-preview',
          config: expect.objectContaining({
            referenceImages: [
              {
                image: { uri: 'gs://vidsnapai-assets/product-hero.png', mimeType: 'image/png' },
                referenceType: 'REFERENCE_TYPE_SUBJECT',
                referenceId: undefined
              },
              {
                image: { uri: 'gs://vidsnapai-assets/brand-style.png', mimeType: 'image/png' },
                referenceType: 'REFERENCE_TYPE_STYLE',
                referenceId: undefined
              }
            ]
          })
        })
      );

      expect(result.operationId).toBe('operations/veo-ref-op-303');
    });
  });

  describe('5. Asynchronous Polling & Operation Status Lifecycle', () => {
    it('returns POLLING status when operation is still in progress', async () => {
      const mockGetOperation = vi.fn().mockResolvedValue({
        name: 'operations/veo-poll-404',
        done: false,
        metadata: { progressPercent: 45 }
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        operations: { getVideosOperation: mockGetOperation }
      };

      const status = await provider.getOperationStatus('operations/veo-poll-404');
      expect(status.status).toBe('POLLING');
      expect(status.done).toBe(false);
      expect(status.videoUri).toBeUndefined();
    });

    it('returns COMPLETED status with video URI when generation finishes', async () => {
      const mockGetOperation = vi.fn().mockResolvedValue({
        name: 'operations/veo-poll-404',
        done: true,
        response: {
          generatedVideos: [
            {
              video: {
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/veo-output-video-123.mp4'
              }
            }
          ]
        }
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        operations: { getVideosOperation: mockGetOperation }
      };

      const status = await provider.getOperationStatus('operations/veo-poll-404');
      expect(status.status).toBe('COMPLETED');
      expect(status.done).toBe(true);
      expect(status.videoUri).toBe('https://generativelanguage.googleapis.com/v1beta/files/veo-output-video-123.mp4');
    });

    it('returns FAILED status when operation contains error payload', async () => {
      const mockGetOperation = vi.fn().mockResolvedValue({
        name: 'operations/veo-poll-failed',
        done: true,
        error: {
          code: 3,
          message: 'Prompt safety violation: content blocked by RAI filter'
        }
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        operations: { getVideosOperation: mockGetOperation }
      };

      const status = await provider.getOperationStatus('operations/veo-poll-failed');
      expect(status.status).toBe('FAILED');
      expect(status.done).toBe(true);
      expect(status.error).toBeDefined();
    });
  });

  describe('6. Error Handling & Safe Retry Behavior', () => {
    it('classifies HTTP 429 as VEO_QUOTA_EXHAUSTED and does NOT aggressively retry', async () => {
      let callCount = 0;
      const mockGenerateVideos = vi.fn().mockImplementation(() => {
        callCount++;
        const error: any = new Error('Resource has been exhausted (e.g. check quota).');
        error.status = 429;
        throw error;
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      await expect(
        provider.generateVideo({ prompt: 'Test video prompt' })
      ).rejects.toThrow(VeoQuotaExhaustedError);

      // Quota exhausted error must immediately halt retries
      expect(callCount).toBe(1);
    });

    it('classifies HTTP 401 as VEO_AUTH_FAILED', async () => {
      const mockGenerateVideos = vi.fn().mockImplementation(() => {
        const error: any = new Error('API key not valid. Please pass a valid API key.');
        error.status = 401;
        throw error;
      });

      const provider = new VeoProvider({ apiKey: 'invalid-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      await expect(
        provider.generateVideo({ prompt: 'Test video prompt' })
      ).rejects.toThrow(VeoAuthError);
    });

    it('classifies HTTP 404 as VEO_MODEL_NOT_FOUND', async () => {
      const mockGenerateVideos = vi.fn().mockImplementation(() => {
        const error: any = new Error('Model not found');
        error.status = 404;
        throw error;
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      await expect(
        provider.generateVideo({ prompt: 'Test video prompt' })
      ).rejects.toThrow(VeoModelNotFoundError);
    });

    it('classifies HTTP 408 / 504 as VEO_TIMEOUT', async () => {
      const mockGenerateVideos = vi.fn().mockImplementation(() => {
        const error: any = new Error('Deadline exceeded / Request timed out');
        error.status = 408;
        throw error;
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      await expect(
        provider.generateVideo({ prompt: 'Test video prompt' })
      ).rejects.toThrow(VeoTimeoutError);
    });

    it('classifies general unexpected error as VEO_OPERATION_FAILED', async () => {
      const mockGenerateVideos = vi.fn().mockImplementation(() => {
        const error: any = new Error('Unknown catastrophic failure');
        throw error;
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      await expect(
        provider.generateVideo({ prompt: 'Test video prompt' })
      ).rejects.toThrow(VeoOperationFailedError);
    });

    it('retries transient 5xx errors with exponential backoff and succeeds on retry', async () => {
      let callCount = 0;
      const mockGenerateVideos = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error: any = new Error('Service Unavailable / Internal Server Error');
          error.status = 503;
          throw error;
        }
        return Promise.resolve({
          name: 'operations/veo-retry-success',
          done: false
        });
      });

      const provider = new VeoProvider({ apiKey: 'test-key' });
      (provider as any).ai = {
        models: { generateVideos: mockGenerateVideos }
      };

      const result = await provider.generateVideo({ prompt: 'Test transient retry' });
      expect(callCount).toBe(2);
      expect(result.operationId).toBe('operations/veo-retry-success');
    });
  });

  describe('7. Video Download & Byte Handling', () => {
    it('decodes base64 data URL into binary Buffer directly without network call', async () => {
      const provider = new VeoProvider({ apiKey: 'test-key' });
      const testBase64 = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=';

      const buffer = await provider.downloadGeneratedVideo(testBase64);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('downloads binary video over HTTP with x-goog-api-key authentication header', async () => {
      const mockVideoData = new TextEncoder().encode('FAKE-MP4-BINARY-STREAM-DATA');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: async () => mockVideoData.buffer
      } as any);

      const provider = new VeoProvider({ apiKey: 'test-gemini-key' });
      const buffer = await provider.downloadGeneratedVideo('https://generativelanguage.googleapis.com/v1beta/files/test-video.mp4');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/files/test-video.mp4',
        {
          headers: { 'x-goog-api-key': 'test-gemini-key' }
        }
      );
      expect(buffer.toString()).toBe('FAKE-MP4-BINARY-STREAM-DATA');
    });

    it('throws structured VeoOutputDownloadError when download fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as any);

      const provider = new VeoProvider({ apiKey: 'test-key' });
      await expect(
        provider.downloadGeneratedVideo('https://generativelanguage.googleapis.com/v1beta/files/missing.mp4')
      ).rejects.toThrow(VeoOutputDownloadError);
    });
  });

  describe('8. Factory Function', () => {
    it('creates VeoProvider instance with createVeoProvider factory', () => {
      const provider = createVeoProvider({ apiKey: 'key-abc' });
      expect(provider).toBeInstanceOf(VeoProvider);
      expect(provider.getModelName()).toBe('veo-3.1-generate-preview');
    });
  });
});
