import type { Request, Response, NextFunction } from 'express';
import type { WorkspaceRole, Campaign } from '@vidsnapai/types';
import { getDatabase } from '@vidsnapai/database';
import { CampaignRepository } from '@vidsnapai/campaign';
import { AppError } from './error-handler.js';

declare global {
  namespace Express {
    interface Request {
      campaign?: Campaign;
    }
  }
}

const db = getDatabase();
const campaignRepo = new CampaignRepository(db);

export function requireCampaignAccess(allowedRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER']) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.brand) {
      return next(new AppError('Brand access context required', 401, 'UNAUTHORIZED'));
    }

    const rawCampaignId = req.params.campaignId;
    const campaignId = Array.isArray(rawCampaignId) ? rawCampaignId[0] : rawCampaignId;

    if (!campaignId) {
      return next(new AppError('Campaign ID parameter is missing', 400, 'BAD_REQUEST'));
    }

    try {
      const campaign = await campaignRepo.findByIdAndBrand(campaignId, req.brand.id);
      if (!campaign) {
        return next(new AppError('Campaign not found for this brand', 404, 'CAMPAIGN_NOT_FOUND'));
      }

      if (req.workspaceRole && !allowedRoles.includes(req.workspaceRole)) {
        return next(
          new AppError(
            `Insufficient permissions. Required role: [${allowedRoles.join(', ')}], your role: ${req.workspaceRole}`,
            403,
            'INSUFFICIENT_PERMISSIONS'
          )
        );
      }

      req.campaign = campaign;
      next();
    } catch (error) {
      next(error);
    }
  };
}
