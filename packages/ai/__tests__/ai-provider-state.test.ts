import { describe, it, expect, beforeEach } from 'vitest';
import {
  AIProviderStateManager,
  VeoProvider,
  VeoQuotaExhaustedError,
  executeAIWithFallback
} from '../src/index.js';

describe('Unified AI Provider State & Quota Circuit Breaker', () => {
  let stateManager: AIProviderStateManager;

  beforeEach(() => {
    stateManager = AIProviderStateManager.getInstance();
    stateManager.resetStatus();
  });

  describe('1. Unified State Transitions & Classifications', () => {
    it('starts in AVAILABLE status for all providers', () => {
      const diag = stateManager.getDiagnostics();
      expect(diag.providerStatus).toBe('AVAILABLE');
      expect(diag.geminiStatus).toBe('AVAILABLE');
      expect(diag.veoStatus).toBe('AVAILABLE');
      expect(diag.quotaState.isGeminiExhausted).toBe(false);
      expect(diag.quotaState.isVeoExhausted).toBe(false);
    });

    it('classifies 429 / RESOURCE_EXHAUSTED as QUOTA_EXHAUSTED with cooldown and retry-after', () => {
      const error = new Error('HTTP 429: Resource exhausted. Rate limit reached for model gemini-3.6-flash. Retry after 45s.');
      const record = stateManager.recordError('gemini', error);

      expect(record.code).toBe('AI_QUOTA_EXHAUSTED');
      expect(record.statusCode).toBe(429);
      expect(record.retryAfterSeconds).toBe(45);

      const diag = stateManager.getDiagnostics();
      expect(diag.geminiStatus).toBe('QUOTA_EXHAUSTED');
      expect(diag.providerStatus).toBe('QUOTA_EXHAUSTED');
      expect(diag.quotaState.isGeminiExhausted).toBe(true);
      expect(diag.quotaState.geminiRetryAfterMs).toBeGreaterThan(0);
    });

    it('classifies Veo quota errors and sets Veo quota state', () => {
      const error = new Error('429 RESOURCE_EXHAUSTED: Google Veo quota limit reached for veo-3.1-generate-preview. Please wait 60s.');
      const record = stateManager.recordError('veo', error);

      expect(record.code).toBe('VEO_QUOTA_EXHAUSTED');
      expect(record.statusCode).toBe(429);
      expect(record.retryAfterSeconds).toBe(60);

      const diag = stateManager.getDiagnostics();
      expect(diag.veoStatus).toBe('QUOTA_EXHAUSTED');
      expect(diag.providerStatus).toBe('QUOTA_EXHAUSTED');
      expect(diag.quotaState.isVeoExhausted).toBe(true);
    });

    it('classifies Authentication failures as AUTH_ERROR', () => {
      const error = new Error('HTTP 401: Invalid API key provided. Authentication failed.');
      const record = stateManager.recordError('gemini', error);

      expect(record.code).toBe('GEMINI_AUTH_FAILED');
      expect(record.statusCode).toBe(401);

      const diag = stateManager.getDiagnostics();
      expect(diag.geminiStatus).toBe('AUTH_ERROR');
      expect(diag.providerStatus).toBe('AUTH_ERROR');
    });

    it('classifies Model Not Found as MODEL_UNAVAILABLE', () => {
      const error = new Error('HTTP 404: Requested model gemini-2.0-flash is not found or deprecated.');
      const record = stateManager.recordError('gemini', error);

      expect(record.code).toBe('GEMINI_MODEL_NOT_FOUND');
      expect(record.statusCode).toBe(404);

      const diag = stateManager.getDiagnostics();
      expect(diag.geminiStatus).toBe('MODEL_UNAVAILABLE');
    });
  });

  describe('2. Circuit Breaker Execution Protection', () => {
    it('blocks immediate execution when in active quota cooldown without hammering provider', () => {
      stateManager.recordError('gemini', new Error('HTTP 429: Resource exhausted. Retry after 30s.'));

      const readiness = stateManager.canExecute('gemini');
      expect(readiness.allowed).toBe(false);
      expect(readiness.reason).toContain('GEMINI_QUOTA_COOLDOWN_ACTIVE');
      expect(readiness.retryAfterMs).toBeGreaterThan(0);
    });

    it('blocks execution when in AUTH_ERROR status', () => {
      stateManager.recordError('veo', new Error('HTTP 401: API key unauthorized.'));

      const readiness = stateManager.canExecute('veo');
      expect(readiness.allowed).toBe(false);
      expect(readiness.reason).toContain('VEO_AUTH_ERROR');
    });

    it('recovers to AVAILABLE upon recording a success', () => {
      stateManager.recordError('gemini', new Error('Transient 503 unavailable'));
      expect(stateManager.getDiagnostics().geminiStatus).toBe('TEMPORARILY_UNAVAILABLE');

      stateManager.recordSuccess('gemini', 'generateContent');
      const diag = stateManager.getDiagnostics();
      expect(diag.geminiStatus).toBe('AVAILABLE');
      expect(diag.lastSuccess?.operation).toBe('generateContent');
    });
  });

  describe('3. Diagnostics Sanitization & Secret Redaction', () => {
    it('strictly redacts secret API keys from error messages and diagnostics report', () => {
      const leakAttemptError = new Error('Request failed with key=AIzaSyD-SecretKey1234567890abcdef and Bearer ya29.a0AfH6SM... auth token');
      const record = stateManager.recordError('gemini', leakAttemptError);

      expect(record.message).not.toContain('AIzaSyD-SecretKey1234567890abcdef');
      expect(record.message).not.toContain('ya29.a0AfH6SM');
      expect(record.message).toContain('[REDACTED_API_KEY]');

      const diag = stateManager.getDiagnostics();
      expect(diag.lastError?.message).not.toContain('AIzaSyD-SecretKey1234567890abcdef');
    });
  });

  describe('4. Deterministic Text Fallback vs. Strict Video No-Fake Guarantee', () => {
    it('allows deterministic blueprint fallback for text generation when Gemini encounters 429', async () => {
      const fallbackResult = await executeAIWithFallback({
        operation: 'Blueprint Generation',
        primary: async () => {
          throw new Error('HTTP 429: Resource exhausted');
        },
        fallback: () => ({
          title: 'Deterministic Fallback Blueprint',
          scenes: [{ sceneNumber: 1, durationSeconds: 4 }]
        })
      });

      expect(fallbackResult.fallbackUsed).toBe(true);
      expect(fallbackResult.aiStatus).toBe('QUOTA_EXHAUSTED');
      expect(fallbackResult.data.title).toBe('Deterministic Fallback Blueprint');
    });

    it('strictly throws VeoQuotaExhaustedError and never produces a fake video for Veo generation', async () => {
      const veo = new VeoProvider({ apiKey: 'mock-key' });
      stateManager.recordError('veo', new Error('HTTP 429: Rate limit reached. Retry after 60s.'));

      await expect(
        veo.generateVideo({
          prompt: 'Cinematic running shoe showcase in 9:16 portrait'
        })
      ).rejects.toThrowError(VeoQuotaExhaustedError);
    });
  });
});
