import type {
  AIUnifiedProviderStatus,
  AIProviderErrorRecord,
  AIProviderSuccessRecord,
  AIProviderDiagnosticsReport
} from '@vidsnapai/types';

export interface ProviderStateInfo {
  status: AIUnifiedProviderStatus;
  lastError: AIProviderErrorRecord | null;
  lastSuccess: AIProviderSuccessRecord | null;
  cooldownUntil: number | null;
  consecutiveErrors: number;
}

export class AIProviderStateManager {
  private static instance: AIProviderStateManager;

  private geminiState: ProviderStateInfo = {
    status: 'AVAILABLE',
    lastError: null,
    lastSuccess: null,
    cooldownUntil: null,
    consecutiveErrors: 0
  };

  private veoState: ProviderStateInfo = {
    status: 'AVAILABLE',
    lastError: null,
    lastSuccess: null,
    cooldownUntil: null,
    consecutiveErrors: 0
  };

  public static getInstance(): AIProviderStateManager {
    if (!AIProviderStateManager.instance) {
      AIProviderStateManager.instance = new AIProviderStateManager();
    }
    return AIProviderStateManager.instance;
  }

  /**
   * Evaluates whether a call to the specified provider is currently permitted by the circuit breaker.
   */
  public canExecute(provider: 'gemini' | 'veo'): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    const state = provider === 'gemini' ? this.geminiState : this.veoState;
    const now = Date.now();

    // 1. Check if provider is in active quota cooldown
    if (state.cooldownUntil && state.cooldownUntil > now) {
      const remainingMs = state.cooldownUntil - now;
      return {
        allowed: false,
        reason: `${provider.toUpperCase()}_QUOTA_COOLDOWN_ACTIVE: Provider quota exhausted. Pausing requests for ${Math.ceil(remainingMs / 1000)}s.`,
        retryAfterMs: remainingMs
      };
    }

    // If cooldown has elapsed, auto-recover state from QUOTA_EXHAUSTED
    if (state.cooldownUntil && state.cooldownUntil <= now && state.status === 'QUOTA_EXHAUSTED') {
      state.cooldownUntil = null;
      state.status = 'AVAILABLE';
    }

    // 2. Check if provider is permanently disabled by auth error
    if (state.status === 'AUTH_ERROR') {
      return {
        allowed: false,
        reason: `${provider.toUpperCase()}_AUTH_ERROR: Invalid or missing API key for ${provider}.`
      };
    }

    return { allowed: true };
  }

  /**
   * Records a successful operation, updating the health state and resetting consecutive error counters.
   */
  public recordSuccess(provider: 'gemini' | 'veo', operation: string): void {
    const state = provider === 'gemini' ? this.geminiState : this.veoState;
    state.consecutiveErrors = 0;
    state.status = 'AVAILABLE';
    state.cooldownUntil = null;
    state.lastSuccess = {
      provider,
      operation,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Records an error, parsing 429 quota exhaustion, auth failures, model unavailability,
   * and setting appropriate cooldown windows to stop hammering the provider.
   */
  public recordError(provider: 'gemini' | 'veo', error: unknown): AIProviderErrorRecord {
    const state = provider === 'gemini' ? this.geminiState : this.veoState;
    state.consecutiveErrors++;

    const rawMsg = error instanceof Error ? error.message : String(error);
    const lowerMsg = rawMsg.toLowerCase();
    const now = Date.now();

    // Sanitize message to guarantee no API keys or secrets are leaked
    const sanitizedMsg = this.sanitizeMessage(rawMsg);

    let code = `${provider.toUpperCase()}_ERROR`;
    let status: AIUnifiedProviderStatus = 'DEGRADED';
    let statusCode = 500;
    let retryAfterSeconds: number | undefined;

    // 1. Quota & Rate Limit (HTTP 429 / RESOURCE_EXHAUSTED)
    if (
      lowerMsg.includes('429') ||
      lowerMsg.includes('resource exhausted') ||
      lowerMsg.includes('resource_exhausted') ||
      lowerMsg.includes('quota') ||
      lowerMsg.includes('rate limit')
    ) {
      code = provider === 'veo' ? 'VEO_QUOTA_EXHAUSTED' : 'AI_QUOTA_EXHAUSTED';
      status = 'QUOTA_EXHAUSTED';
      statusCode = 429;

      // Extract retry-after from message (e.g., "retry after 45s" or "retry-after: 60")
      const retryMatch = rawMsg.match(/retry[- ]after[: ]+([0-9]+)/i) || rawMsg.match(/in ([0-9]+)s/i);
      if (retryMatch) {
        retryAfterSeconds = parseInt(retryMatch[1], 10);
      } else {
        // Default circuit breaker cooldown: 60 seconds
        retryAfterSeconds = 60;
      }

      const retryAfterMs = retryAfterSeconds * 1000;
      state.cooldownUntil = now + retryAfterMs;
    }
    // 2. Authentication Errors (HTTP 401 / 403)
    else if (
      lowerMsg.includes('401') ||
      lowerMsg.includes('403') ||
      lowerMsg.includes('api key') ||
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('authentication')
    ) {
      code = `${provider.toUpperCase()}_AUTH_FAILED`;
      status = 'AUTH_ERROR';
      statusCode = 401;
    }
    // 3. Model Unavailable / Not Found (HTTP 404)
    else if (
      lowerMsg.includes('404') ||
      lowerMsg.includes('not found') ||
      lowerMsg.includes('not_found') ||
      lowerMsg.includes('no longer available')
    ) {
      code = `${provider.toUpperCase()}_MODEL_NOT_FOUND`;
      status = 'MODEL_UNAVAILABLE';
      statusCode = 404;
    }
    // 4. Temporary Outage / Timeout (HTTP 500 / 503)
    else if (
      lowerMsg.includes('500') ||
      lowerMsg.includes('503') ||
      lowerMsg.includes('timeout') ||
      lowerMsg.includes('deadline') ||
      lowerMsg.includes('unavailable')
    ) {
      code = `${provider.toUpperCase()}_TEMPORARILY_UNAVAILABLE`;
      status = 'TEMPORARILY_UNAVAILABLE';
      statusCode = 503;
      // Set short backoff cooldown
      state.cooldownUntil = now + 15000; // 15s
    }

    state.status = status;

    const errorRecord: AIProviderErrorRecord = {
      provider,
      code,
      message: sanitizedMsg,
      timestamp: new Date().toISOString(),
      statusCode,
      retryAfterSeconds,
      retryAfterMs: retryAfterSeconds ? retryAfterSeconds * 1000 : undefined
    };

    state.lastError = errorRecord;
    return errorRecord;
  }

  /**
   * Resets status back to AVAILABLE (e.g., on manual retry or successful health check).
   */
  public resetStatus(provider?: 'gemini' | 'veo'): void {
    if (!provider || provider === 'gemini') {
      this.geminiState = {
        status: 'AVAILABLE',
        lastError: null,
        lastSuccess: null,
        cooldownUntil: null,
        consecutiveErrors: 0
      };
    }
    if (!provider || provider === 'veo') {
      this.veoState = {
        status: 'AVAILABLE',
        lastError: null,
        lastSuccess: null,
        cooldownUntil: null,
        consecutiveErrors: 0
      };
    }
  }

  public resetAll(): void {
    this.resetStatus();
  }

  /**
   * Generates a comprehensive, sanitized diagnostics report for API consumers and frontend status widgets.
   */
  public getDiagnostics(options?: { geminiModel?: string; veoModel?: string }): AIProviderDiagnosticsReport {
    const now = Date.now();
    const geminiModel = options?.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const veoModel = options?.veoModel || process.env.VEO_MODEL || 'veo-3.1-generate-preview';

    // Compute aggregate provider status
    let overallStatus: AIUnifiedProviderStatus = 'AVAILABLE';
    if (this.geminiState.status === 'AUTH_ERROR' || this.veoState.status === 'AUTH_ERROR') {
      overallStatus = 'AUTH_ERROR';
    } else if (this.geminiState.status === 'QUOTA_EXHAUSTED' || this.veoState.status === 'QUOTA_EXHAUSTED') {
      overallStatus = 'QUOTA_EXHAUSTED';
    } else if (this.geminiState.status === 'MODEL_UNAVAILABLE' || this.veoState.status === 'MODEL_UNAVAILABLE') {
      overallStatus = 'MODEL_UNAVAILABLE';
    } else if (this.geminiState.status === 'TEMPORARILY_UNAVAILABLE' || this.veoState.status === 'TEMPORARILY_UNAVAILABLE') {
      overallStatus = 'TEMPORARILY_UNAVAILABLE';
    } else if (this.geminiState.status === 'DEGRADED' || this.veoState.status === 'DEGRADED') {
      overallStatus = 'DEGRADED';
    }

    const isGeminiExhausted = Boolean(this.geminiState.cooldownUntil && this.geminiState.cooldownUntil > now);
    const isVeoExhausted = Boolean(this.veoState.cooldownUntil && this.veoState.cooldownUntil > now);

    const geminiRetryAfterMs = isGeminiExhausted ? (this.geminiState.cooldownUntil! - now) : undefined;
    const veoRetryAfterMs = isVeoExhausted ? (this.veoState.cooldownUntil! - now) : undefined;

    // Choose most recent error & success
    let mostRecentError = this.geminiState.lastError;
    if (
      this.veoState.lastError &&
      (!mostRecentError || new Date(this.veoState.lastError.timestamp) > new Date(mostRecentError.timestamp))
    ) {
      mostRecentError = this.veoState.lastError;
    }

    let mostRecentSuccess = this.geminiState.lastSuccess;
    if (
      this.veoState.lastSuccess &&
      (!mostRecentSuccess || new Date(this.veoState.lastSuccess.timestamp) > new Date(mostRecentSuccess.timestamp))
    ) {
      mostRecentSuccess = this.veoState.lastSuccess;
    }

    return {
      geminiModel,
      veoModel,
      providerStatus: overallStatus,
      geminiStatus: this.geminiState.status,
      veoStatus: this.veoState.status,
      lastError: mostRecentError,
      lastSuccess: mostRecentSuccess,
      quotaState: {
        isGeminiExhausted,
        isVeoExhausted,
        geminiRetryAfterMs,
        veoRetryAfterMs,
        geminiCooldownUntil: this.geminiState.cooldownUntil ? new Date(this.geminiState.cooldownUntil).toISOString() : null,
        veoCooldownUntil: this.veoState.cooldownUntil ? new Date(this.veoState.cooldownUntil).toISOString() : null
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Sanitizes text strings to strictly strip any API keys or secret tokens.
   */
  private sanitizeMessage(message: string): string {
    return message
      .replace(/AIza[0-9A-Za-z-_]{25,}/g, '[REDACTED_API_KEY]')
      .replace(/key=[^&\s]+/gi, 'key=[REDACTED_API_KEY]')
      .replace(/bearer\s+[a-z0-9-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_SECRET]');
  }
}

export const aiProviderStateManager = AIProviderStateManager.getInstance();
