import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GeminiProvider,
  createAIProvider,
  normalizeGeminiModel,
  logAIStartupDiagnostics,
  AIProviderNotFoundError,
  AIProviderRateLimitError,
  AIProviderTimeoutError,
  AIProviderAuthError,
  AIProviderUnavailableError
} from '../src/index.js';

describe('AI Provider Package & Gemini Model Migration', () => {
  const originalEnv = process.env.GEMINI_MODEL;

  beforeEach(() => {
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GEMINI_MODEL = originalEnv;
    } else {
      delete process.env.GEMINI_MODEL;
    }
  });

  describe('1. Model Normalization & Configuration', () => {
    it('defaults to gemini-3.6-flash when no model is specified', () => {
      expect(normalizeGeminiModel()).toBe('gemini-3.6-flash');
      expect(normalizeGeminiModel('')).toBe('gemini-3.6-flash');
      expect(normalizeGeminiModel('   ')).toBe('gemini-3.6-flash');
    });

    it('respects GEMINI_MODEL environment variable override', () => {
      process.env.GEMINI_MODEL = 'gemini-3.6-flash';
      expect(normalizeGeminiModel()).toBe('gemini-3.6-flash');

      process.env.GEMINI_MODEL = 'gemini-1.5-pro';
      expect(normalizeGeminiModel()).toBe('gemini-1.5-pro');
    });

    it('normalizes and removes duplicate "models/" prefixes without duplication', () => {
      expect(normalizeGeminiModel('models/gemini-3.6-flash')).toBe('gemini-3.6-flash');
      expect(normalizeGeminiModel('models/models/gemini-3.6-flash')).toBe('gemini-3.6-flash');
      expect(normalizeGeminiModel('  models/gemini-3.6-flash/  ')).toBe('gemini-3.6-flash');
    });

    it('detects and migrates obsolete gemini-2.0-flash to gemini-3.6-flash', () => {
      expect(normalizeGeminiModel('gemini-2.0-flash')).toBe('gemini-3.6-flash');
      expect(normalizeGeminiModel('models/gemini-2.0-flash')).toBe('gemini-3.6-flash');
      expect(normalizeGeminiModel('gemini-2.0-flash-exp')).toBe('gemini-3.6-flash');
    });

    it('provides safe startup diagnostics without exposing secret key', () => {
      const diag = logAIStartupDiagnostics({ apiKey: 'secret-12345-key', modelName: 'gemini-3.6-flash' });
      expect(diag.provider).toBe('gemini');
      expect(diag.effectiveModel).toBe('gemini-3.6-flash');
      expect(diag.hasApiKey).toBe(true);
      expect((diag as any).apiKey).toBeUndefined();
    });

    it('instantiates GeminiProvider with default model gemini-3.6-flash', () => {
      const provider = new GeminiProvider({ apiKey: 'test-api-key' });
      expect(provider.providerName).toBe('gemini');
      expect((provider as any).defaultModel).toBe('gemini-3.6-flash');
    });

    it('instantiates GeminiProvider with custom model and normalizes it', () => {
      const provider = new GeminiProvider({ apiKey: 'test-api-key', modelName: 'models/gemini-3.6-flash' });
      expect((provider as any).defaultModel).toBe('gemini-3.6-flash');
    });

    it('createAIProvider automatically resolves normalized gemini-3.6-flash', () => {
      const provider = createAIProvider({ apiKey: 'test-key' });
      expect(provider.providerName).toBe('gemini');
      expect((provider as any).defaultModel).toBe('gemini-3.6-flash');
    });
  });

  describe('2. Error Classification & 404 Model Handling', () => {
    it('throws helpful error if apiKey is not configured on request', async () => {
      const provider = new GeminiProvider({ apiKey: '' });
      await expect(provider.generateText('hello')).rejects.toThrow('GEMINI_API_KEY');
    });

    it('creates AIProviderNotFoundError with statusCode 404 and isRetryable false', () => {
      const err = new AIProviderNotFoundError('Model models/gemini-2.0-flash is no longer available');
      expect(err.code).toBe('MODEL_NOT_FOUND');
      expect(err.status).toBe(404);
      expect(err.isRetryable).toBe(false);
    });

    it('creates distinguishable rate limit, timeout, auth, and unavailable errors', () => {
      const rateLimitErr = new AIProviderRateLimitError('gemini', 'gemini-3.6-flash', 'Quota exceeded');
      expect(rateLimitErr.code).toBe('AI_QUOTA_EXHAUSTED');
      expect(rateLimitErr.status).toBe(429);
      expect(rateLimitErr.isRetryable).toBe(false);

      const timeoutErr = new AIProviderTimeoutError('Deadline exceeded');
      expect(timeoutErr.code).toBe('TIMEOUT');
      expect(timeoutErr.status).toBe(408);
      expect(timeoutErr.isRetryable).toBe(true);

      const authErr = new AIProviderAuthError('Invalid API key');
      expect(authErr.code).toBe('AUTHENTICATION_FAILED');
      expect(authErr.status).toBe(401);
      expect(authErr.isRetryable).toBe(false);

      const unavailErr = new AIProviderUnavailableError('Service down');
      expect(unavailErr.code).toBe('SERVICE_UNAVAILABLE');
      expect(unavailErr.status).toBe(503);
      expect(unavailErr.isRetryable).toBe(true);
    });

    it('instantiates MockAIProvider when no API key is provided in createAIProvider', () => {
      const provider = createAIProvider({ apiKey: '' });
      expect(provider.providerName).toBe('mock_ai');
    });
  });
});
