import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import { CampaignDirectorService } from '@vidsnapai/campaign';
import { CampaignDirectorRunRequestSchema } from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';
import { getVerifiedWorkspaceId } from '../middleware/workspace.js';

export const campaignDirectorRouter = Router();

const db = getDatabase();
const config = getConfig();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });
const directorService = new CampaignDirectorService(db, aiProvider);

// POST /api/campaign-director/run
campaignDirectorRouter.post(
  '/run',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
      const parsed = CampaignDirectorRunRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new AppError(msg, 400, 'VALIDATION_ERROR');
      }

      const result = await directorService.runDirector(workspaceId, parsed.data);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaign-director/latest?brandId=...
campaignDirectorRouter.get(
  '/latest',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const brandId = req.query.brandId as string;

      if (!brandId) {
        throw new AppError('brandId query parameter is required', 400, 'VALIDATION_ERROR');
      }

      const latest = await directorService.getLatestRun(brandId, workspaceId);

      res.status(200).json({
        success: true,
        data: latest,
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/campaign-director/history?brandId=...
campaignDirectorRouter.get(
  '/history',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = await getVerifiedWorkspaceId(req);
      const brandId = req.query.brandId as string;

      if (!brandId) {
        throw new AppError('brandId query parameter is required', 400, 'VALIDATION_ERROR');
      }

      const history = await directorService.listRuns(brandId, workspaceId);

      res.status(200).json({
        success: true,
        data: history,
        meta: {
          requestId: req.id,
          count: history.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
