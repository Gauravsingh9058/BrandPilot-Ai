import { Router, type Request, type Response } from 'express';
import { aiProviderStateManager } from '@vidsnapai/ai';
import type { ApiResponse, AIProviderDiagnosticsReport } from '@vidsnapai/types';

export const aiRouter: Router = Router();

/**
 * GET /api/ai/provider-status
 * 
 * Returns real-time diagnostics and unified state for Google Gemini and Veo AI engines.
 * NEVER exposes API keys or sensitive credential information.
 */
aiRouter.get('/provider-status', (req: Request, res: Response) => {
  const diagnostics: AIProviderDiagnosticsReport = aiProviderStateManager.getDiagnostics({
    geminiModel: process.env.GEMINI_MODEL,
    veoModel: process.env.VEO_MODEL
  });

  const isHealthy = diagnostics.providerStatus === 'AVAILABLE' || diagnostics.providerStatus === 'DEGRADED';

  const response: ApiResponse<AIProviderDiagnosticsReport> = {
    success: true,
    data: diagnostics,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };

  // Return HTTP 200 even on quota/error so client can inspect diagnostics payload
  res.status(isHealthy ? 200 : 200).json(response);
});

/**
 * GET /api/ai/diagnostics (Alias)
 */
aiRouter.get('/diagnostics', (req: Request, res: Response) => {
  const diagnostics = aiProviderStateManager.getDiagnostics({
    geminiModel: process.env.GEMINI_MODEL,
    veoModel: process.env.VEO_MODEL
  });

  res.json({
    success: true,
    data: diagnostics,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * POST /api/ai/reset-status
 * Manually reset quota cooldowns or degraded states.
 */
aiRouter.post('/reset-status', (req: Request, res: Response) => {
  const provider = req.body?.provider as 'gemini' | 'veo' | undefined;
  aiProviderStateManager.resetStatus(provider);

  const updatedDiagnostics = aiProviderStateManager.getDiagnostics({
    geminiModel: process.env.GEMINI_MODEL,
    veoModel: process.env.VEO_MODEL
  });

  res.json({
    success: true,
    message: `AI provider status successfully reset for ${provider || 'all providers'}.`,
    data: updatedDiagnostics,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  });
});
