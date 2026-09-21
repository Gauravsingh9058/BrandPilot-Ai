import { GoogleGenAI } from '@google/genai';
import type {
  VeoModel,
  VeoResolution,
  VeoAspectRatio,
  VeoDuration,
  VeoOperationStatus,
  VeoImageInput,
  VeoVideoGenerationInput,
  VeoImageToVideoInput,
  VeoReferenceVideoInput,
  VeoOperationResult,
  VeoProviderConfig
} from '@vidsnapai/types';

// ==========================================
// Structured Veo Errors
// ==========================================

export class VeoError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'VEO_ERROR',
    public readonly status?: number,
    public readonly isRetryable: boolean = false,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VeoError';
  }
}

export class VeoQuotaExhaustedError extends VeoError {
  constructor(
    message: string = 'Google Veo quota exhausted or rate limit exceeded. Please try again later.',
    public readonly model: string = 'veo-3.1-generate-preview',
    public readonly retryAfter?: number
  ) {
    super(message, 'VEO_QUOTA_EXHAUSTED', 429, false, { model, retryAfter });
    this.name = 'VeoQuotaExhaustedError';
  }
}

export class VeoAuthError extends VeoError {
  constructor(message: string = 'Authentication failed for Google Veo API. Verify GEMINI_API_KEY.') {
    super(message, 'VEO_AUTH_FAILED', 401, false);
    this.name = 'VeoAuthError';
  }
}

export class VeoModelNotFoundError extends VeoError {
  constructor(model: string = 'veo-3.1-generate-preview') {
    super(`Veo model "${model}" not found or not supported.`, 'VEO_MODEL_NOT_FOUND', 404, false, { model });
    this.name = 'VeoModelNotFoundError';
  }
}

export class VeoOperationFailedError extends VeoError {
  constructor(
    message: string,
    public readonly operationId?: string,
    public readonly rawError?: Record<string, unknown>,
    isRetryable: boolean = false
  ) {
    super(message, 'VEO_OPERATION_FAILED', 500, isRetryable, { operationId, rawError });
    this.name = 'VeoOperationFailedError';
  }
}

export class VeoTimeoutError extends VeoError {
  constructor(message: string = 'Veo operation timed out.') {
    super(message, 'VEO_TIMEOUT', 408, true);
    this.name = 'VeoTimeoutError';
  }
}

export class VeoOutputDownloadError extends VeoError {
  constructor(message: string, public readonly uri?: string) {
    super(message, 'VEO_OUTPUT_DOWNLOAD_FAILED', 502, true, { uri });
    this.name = 'VeoOutputDownloadError';
  }
}

// ==========================================
// Helper Utilities
// ==========================================

export const DEFAULT_VEO_MODEL: VeoModel = 'veo-3.1-generate-preview';
export const DEFAULT_VEO_RESOLUTION: VeoResolution = '720p';
export const DEFAULT_VEO_ASPECT_RATIO: VeoAspectRatio = '9:16';
export const DEFAULT_VEO_DURATION: VeoDuration = 8;

import { aiProviderStateManager } from './aiProviderState.js';

export function normalizeVeoModel(model?: string): string {
  if (!model || model.trim().length === 0) {
    return DEFAULT_VEO_MODEL;
  }
  const trimmed = model.trim();
  // Ensure old or obsolete identifiers are safely normalized to 3.1 preview
  if (
    trimmed.startsWith('veo-2') ||
    trimmed.includes('veo-2.0') ||
    trimmed.includes('gemini-2.0') ||
    trimmed === 'veo'
  ) {
    return DEFAULT_VEO_MODEL;
  }
  return trimmed;
}

function classifyVeoError(error: unknown, model: string = DEFAULT_VEO_MODEL): VeoError {
  const recorded = aiProviderStateManager.recordError('veo', error);

  if (error instanceof VeoError) {
    return error;
  }

  const errObj = (typeof error === 'object' && error !== null ? error : {}) as Record<string, unknown>;
  const message = String(errObj.message || error || 'Unknown Veo error');
  const status = typeof errObj.status === 'number' ? errObj.status : recorded.statusCode;
  const lowerMsg = message.toLowerCase();

  // 1. Quota & Rate Limit (HTTP 429) -> NEVER aggressively retry
  if (
    status === 429 ||
    recorded.code === 'VEO_QUOTA_EXHAUSTED' ||
    lowerMsg.includes('quota') ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('too many requests')
  ) {
    return new VeoQuotaExhaustedError(
      `[Veo 3.1] Quota exceeded for model "${model}": ${message}`,
      model,
      recorded.retryAfterSeconds
    );
  }

  // 2. Authentication (HTTP 401 / 403)
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('api_key') ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('invalid api key')
  ) {
    return new VeoAuthError(`[Veo 3.1] Authentication failure: ${message}`);
  }

  // 3. Model Not Found (HTTP 404)
  if (status === 404 || lowerMsg.includes('not found') || lowerMsg.includes('unsupported model')) {
    return new VeoModelNotFoundError(model);
  }

  // 4. Timeout (HTTP 408 / 504)
  if (status === 408 || status === 504 || lowerMsg.includes('timed out') || lowerMsg.includes('deadline_exceeded')) {
    return new VeoTimeoutError(`[Veo 3.1] Request timed out: ${message}`);
  }

  // 5. Transient Server Errors (HTTP 500 / 502 / 503)
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    lowerMsg.includes('service unavailable') ||
    lowerMsg.includes('internal server error') ||
    lowerMsg.includes('backend error')
  ) {
    return new VeoOperationFailedError(
      `[Veo 3.1] Transient server error: ${message}`,
      undefined,
      errObj,
      true // isRetryable
    );
  }

  // 6. General Operation / Service Failure
  return new VeoOperationFailedError(`[Veo 3.1] Operation failed: ${message}`, undefined, errObj, false);
}

async function withVeoRetry<T>(
  fn: () => Promise<T>,
  model: string = DEFAULT_VEO_MODEL,
  maxRetries: number = 2
): Promise<T> {
  const readiness = aiProviderStateManager.canExecute('veo');
  if (!readiness.allowed) {
    const retrySec = readiness.retryAfterMs ? Math.ceil(readiness.retryAfterMs / 1000) : undefined;
    throw new VeoQuotaExhaustedError(
      readiness.reason || `[Veo 3.1] Quota limit active for "${model}". Pausing requests.`,
      model,
      retrySec
    );
  }

  let attempt = 0;
  while (true) {
    try {
      const result = await fn();
      aiProviderStateManager.recordSuccess('veo', 'videoOperation');
      return result;
    } catch (err) {
      const classified = classifyVeoError(err, model);
      attempt++;
      // Only retry transient 5xx / timeout errors, NOT 429 quota or 401 auth
      if (classified.isRetryable && attempt <= maxRetries) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw classified;
    }
  }
}

// ==========================================
// VeoProvider Implementation
// ==========================================

export class VeoProvider {
  public readonly providerName = 'google-veo';
  private ai: GoogleGenAI | null = null;
  private apiKey: string;
  private defaultModel: string;
  private enabled: boolean;
  private defaultResolution: VeoResolution;
  private defaultAspectRatio: VeoAspectRatio;
  private defaultDuration: VeoDuration;

  constructor(config?: Partial<VeoProviderConfig>) {
    this.apiKey = config?.apiKey !== undefined ? config.apiKey : (process.env.GEMINI_API_KEY || '');
    this.defaultModel = normalizeVeoModel(config?.model || process.env.VEO_MODEL);
    this.enabled = config?.enabled !== undefined ? config.enabled : process.env.VEO_ENABLED !== 'false';
    this.defaultResolution = (config?.defaultResolution || process.env.VEO_DEFAULT_RESOLUTION || DEFAULT_VEO_RESOLUTION) as VeoResolution;
    this.defaultAspectRatio = (config?.defaultAspectRatio || process.env.VEO_DEFAULT_ASPECT_RATIO || DEFAULT_VEO_ASPECT_RATIO) as VeoAspectRatio;
    this.defaultDuration = Number(config?.defaultDuration || process.env.VEO_DEFAULT_DURATION || DEFAULT_VEO_DURATION) as VeoDuration;

    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  public isVeoEnabled(): boolean {
    return this.enabled && !!this.apiKey && this.apiKey.trim().length > 0;
  }

  public getModelName(): string {
    return this.defaultModel;
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      if (!this.apiKey || this.apiKey.trim().length === 0) {
        throw new VeoAuthError(
          '[VeoProvider] GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment.'
        );
      }
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.ai;
  }

  /**
   * 1. Text-to-Video Generation
   */
  async generateVideo(input: VeoVideoGenerationInput): Promise<VeoOperationResult> {
    if (!this.isVeoEnabled() && process.env.NODE_ENV !== 'test') {
      throw new VeoError('Google Veo 3.1 video generation is currently disabled or unconfigured.', 'VEO_DISABLED', 400, false);
    }

    const model = normalizeVeoModel(input.model || this.defaultModel);
    const client = this.getClient();

    const config: Record<string, unknown> = {
      aspectRatio: input.aspectRatio || this.defaultAspectRatio,
      durationSeconds: input.durationSeconds || this.defaultDuration,
      resolution: input.resolution || this.defaultResolution,
      numberOfVideos: input.numberOfVideos ?? 1
    };

    if (input.fps) config.fps = input.fps;
    if (input.negativePrompt) config.negativePrompt = input.negativePrompt;
    if (input.enhancePrompt !== undefined) config.enhancePrompt = input.enhancePrompt;
    if (input.generateAudio !== undefined) config.generateAudio = input.generateAudio;
    if (input.seed !== undefined) config.seed = input.seed;
    if (input.personGeneration) config.personGeneration = input.personGeneration;

    return withVeoRetry(async () => {
      const operation = await client.models.generateVideos({
        model,
        prompt: input.prompt,
        config: config as any
      });

      const operationId = operation.name || `veo-op-${Date.now()}`;
      return this.mapOperationToResult(operation, model, operationId);
    }, model);
  }

  /**
   * 2. Image-to-Video Generation (First-frame + optional Last-frame interpolation)
   */
  async generateImageToVideo(input: VeoImageToVideoInput): Promise<VeoOperationResult> {
    if (!this.isVeoEnabled() && process.env.NODE_ENV !== 'test') {
      throw new VeoError('Google Veo 3.1 video generation is currently disabled or unconfigured.', 'VEO_DISABLED', 400, false);
    }

    const model = normalizeVeoModel(input.model || this.defaultModel);
    const client = this.getClient();

    const imagePayload = this.formatImagePayload(input.image);
    const config: Record<string, unknown> = {
      aspectRatio: input.aspectRatio || this.defaultAspectRatio,
      durationSeconds: input.durationSeconds || this.defaultDuration,
      resolution: input.resolution || this.defaultResolution,
      numberOfVideos: input.numberOfVideos ?? 1
    };

    if (input.lastFrame) {
      config.lastFrame = this.formatImagePayload(input.lastFrame);
    }
    if (input.fps) config.fps = input.fps;
    if (input.negativePrompt) config.negativePrompt = input.negativePrompt;
    if (input.enhancePrompt !== undefined) config.enhancePrompt = input.enhancePrompt;
    if (input.generateAudio !== undefined) config.generateAudio = input.generateAudio;
    if (input.seed !== undefined) config.seed = input.seed;
    if (input.personGeneration) config.personGeneration = input.personGeneration;

    return withVeoRetry(async () => {
      const operation = await client.models.generateVideos({
        model,
        prompt: input.prompt || undefined,
        image: imagePayload as any,
        config: config as any
      });

      const operationId = operation.name || `veo-op-${Date.now()}`;
      return this.mapOperationToResult(operation, model, operationId);
    }, model);
  }

  /**
   * 3. Product Reference-Image Video Generation
   */
  async generateReferenceVideo(input: VeoReferenceVideoInput): Promise<VeoOperationResult> {
    if (!this.isVeoEnabled() && process.env.NODE_ENV !== 'test') {
      throw new VeoError('Google Veo 3.1 video generation is currently disabled or unconfigured.', 'VEO_DISABLED', 400, false);
    }

    const model = normalizeVeoModel(input.model || this.defaultModel);
    const client = this.getClient();

    const referenceImages = input.referenceImages.map((ref) => ({
      image: this.formatImagePayload(ref.image),
      referenceType: ref.referenceType || 'REFERENCE_TYPE_SUBJECT',
      referenceId: ref.referenceId
    }));

    const config: Record<string, unknown> = {
      aspectRatio: input.aspectRatio || this.defaultAspectRatio,
      durationSeconds: input.durationSeconds || this.defaultDuration,
      resolution: input.resolution || this.defaultResolution,
      numberOfVideos: input.numberOfVideos ?? 1,
      referenceImages
    };

    if (input.fps) config.fps = input.fps;
    if (input.negativePrompt) config.negativePrompt = input.negativePrompt;
    if (input.enhancePrompt !== undefined) config.enhancePrompt = input.enhancePrompt;
    if (input.generateAudio !== undefined) config.generateAudio = input.generateAudio;
    if (input.seed !== undefined) config.seed = input.seed;
    if (input.personGeneration) config.personGeneration = input.personGeneration;

    return withVeoRetry(async () => {
      const operation = await client.models.generateVideos({
        model,
        prompt: input.prompt,
        config: config as any
      });

      const operationId = operation.name || `veo-op-${Date.now()}`;
      return this.mapOperationToResult(operation, model, operationId);
    }, model);
  }

  /**
   * 4. Asynchronous Operation Polling
   */
  async getOperationStatus(operationNameOrId: string): Promise<VeoOperationResult> {
    const model = this.defaultModel;
    const client = this.getClient();

    return withVeoRetry(async () => {
      // Fetch latest operation state
      const operation = await client.operations.getVideosOperation({
        operation: { name: operationNameOrId } as any
      });

      return this.mapOperationToResult(operation, model, operationNameOrId);
    }, model);
  }

  /**
   * 5. Download Generated Video (URI or raw bytes)
   */
  async downloadGeneratedVideo(uriOrBytes: string | Uint8Array): Promise<Buffer> {
    if (typeof uriOrBytes !== 'string') {
      return Buffer.from(uriOrBytes);
    }

    // Handle base64 / data URL
    if (uriOrBytes.startsWith('data:')) {
      const base64Data = uriOrBytes.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // Download from remote URL / Google API endpoint
    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['x-goog-api-key'] = this.apiKey;
      }

      const response = await fetch(uriOrBytes, { headers });
      if (!response.ok) {
        throw new VeoOutputDownloadError(
          `Failed to download Veo output video from ${uriOrBytes}: HTTP ${response.status} ${response.statusText}`,
          uriOrBytes
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof VeoOutputDownloadError) throw err;
      throw new VeoOutputDownloadError(
        `Error downloading Veo video: ${(err as Error).message}`,
        uriOrBytes
      );
    }
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private formatImagePayload(imageInput: VeoImageInput): Record<string, unknown> {
    if (imageInput.imageBytes) {
      return {
        imageBytes: imageInput.imageBytes,
        mimeType: imageInput.mimeType || 'image/png'
      };
    }
    if (imageInput.uri) {
      return {
        uri: imageInput.uri,
        mimeType: imageInput.mimeType
      };
    }
    throw new VeoError('Veo image input must contain either imageBytes (base64) or uri.', 'VEO_INVALID_INPUT', 400, false);
  }

  private mapOperationToResult(
    operation: any,
    model: string,
    fallbackOperationId: string
  ): VeoOperationResult {
    const operationId = operation.name || fallbackOperationId;
    const isDone = Boolean(operation.done);

    let status: VeoOperationStatus = 'SUBMITTED';
    if (isDone) {
      if (operation.error) {
        status = 'FAILED';
      } else {
        status = 'COMPLETED';
      }
    } else {
      // If operation is already tracked and still in progress
      status = 'POLLING';
    }

    const generatedVideo = operation.response?.generatedVideos?.[0];
    const videoUri = generatedVideo?.video?.uri || generatedVideo?.uri;
    const videoBytes = generatedVideo?.video?.videoBytes || generatedVideo?.videoBytes;
    const raiFilteredCount = operation.response?.raiMediaFilteredCount;
    const raiFilteredReasons = operation.response?.raiMediaFilteredReasons;

    if (raiFilteredCount && raiFilteredCount > 0 && !videoUri && !videoBytes) {
      status = 'FAILED';
    }

    return {
      operationId,
      status,
      done: isDone,
      provider: 'google-veo',
      model,
      videoUri,
      videoBytes: typeof videoBytes === 'string' ? videoBytes : undefined,
      raiFilteredCount,
      raiFilteredReasons,
      error: operation.error,
      metadata: operation.metadata
    };
  }
}

export function createVeoProvider(config?: Partial<VeoProviderConfig>): VeoProvider {
  return new VeoProvider(config);
}
