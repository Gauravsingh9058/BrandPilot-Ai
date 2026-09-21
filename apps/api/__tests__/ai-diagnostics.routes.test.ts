import { describe, it, expect, beforeEach } from 'vitest';
import { aiProviderStateManager } from '@vidsnapai/ai';

describe('AI Diagnostics & Provider Status Logic', () => {
  beforeEach(() => {
    aiProviderStateManager.resetAll();
  });

  describe('GET /api/ai/provider-status contract', () => {
    it('returns diagnostics report with Gemini 3.6 & Veo 3.1 metadata', () => {
      const diag = aiProviderStateManager.getDiagnostics();

      expect(diag.geminiModel).toBeDefined();
      expect(diag.veoModel).toBeDefined();
      expect(diag.providerStatus).toBe('AVAILABLE');
      expect(diag.geminiStatus).toBe('AVAILABLE');
      expect(diag.veoStatus).toBe('AVAILABLE');
      expect(diag.quotaState).toBeDefined();
      expect(diag.quotaState.isGeminiExhausted).toBe(false);
      expect(diag.quotaState.isVeoExhausted).toBe(false);
      expect(diag.timestamp).toBeDefined();
    });

    it('reflects QUOTA_EXHAUSTED state with cooldown when rate limits are hit', () => {
      // Simulate a 429 quota exhaustion on Veo
      aiProviderStateManager.recordError(
        'veo',
        new Error('HTTP 429: Rate limit exceeded for model veo-3.1-generate-preview. Retry after 60s.')
      );

      const diag = aiProviderStateManager.getDiagnostics();
      expect(diag.providerStatus).toBe('QUOTA_EXHAUSTED');
      expect(diag.veoStatus).toBe('QUOTA_EXHAUSTED');
      expect(diag.quotaState.isVeoExhausted).toBe(true);
      expect(diag.lastError).toBeDefined();
      expect(diag.lastError?.provider).toBe('veo');
      expect(diag.lastError?.code).toBe('VEO_QUOTA_EXHAUSTED');
    });

    it('NEVER exposes API keys or bearer tokens in the diagnostics response', () => {
      // Attempt to trigger error with simulated key
      aiProviderStateManager.recordError(
        'gemini',
        new Error('Authentication failed with key=AIzaSyD-SecretGeminiKey1234567890 and Bearer secret-token')
      );

      const diag = aiProviderStateManager.getDiagnostics();
      expect(diag.lastError?.message).not.toContain('AIzaSyD-SecretGeminiKey1234567890');
      expect(diag.lastError?.message).not.toContain('secret-token');
      expect(diag.lastError?.message).toContain('[REDACTED');
    });
  });
});
