import type { Request, Response, NextFunction } from 'express';
import type { WorkspaceRole, ContentPlan } from '@vidsnapai/types';
import { getDatabase } from '@vidsnapai/database';
import { ContentPlanRepository } from '@vidsnapai/content';
import { AppError } from './error-handler.js';

declare global {
  namespace Express {
    interface Request {
      contentPlan?: ContentPlan;
    }
  }
}

const db = getDatabase();
const planRepo = new ContentPlanRepository(db);

export function requireContentPlanAccess(allowedRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER']) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.brand) {
      return next(new AppError('Brand access context required', 401, 'UNAUTHORIZED'));
    }

    const rawPlanId = req.params.planId;
    const planId = Array.isArray(rawPlanId) ? rawPlanId[0] : rawPlanId;

    if (!planId) {
      return next(new AppError('Content Plan ID parameter is missing', 400, 'BAD_REQUEST'));
    }

    try {
      const plan = await planRepo.findByIdAndBrand(planId, req.brand.id);
      if (!plan) {
        return next(new AppError('Content Plan not found for this brand', 404, 'CONTENT_PLAN_NOT_FOUND'));
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

      req.contentPlan = plan;
      next();
    } catch (error) {
      next(error);
    }
  };
}
