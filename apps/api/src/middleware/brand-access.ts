import type { Request, Response, NextFunction } from 'express';
import type { WorkspaceRole, Brand } from '@vidsnapai/types';
import { WorkspaceRepository, getDatabase } from '@vidsnapai/database';
import { BrandRepository } from '@vidsnapai/brand';
import { AppError } from './error-handler.js';

declare global {
  namespace Express {
    interface Request {
      brand?: Brand;
      activeWorkspaceId?: string;
    }
  }
}

const db = getDatabase();
const brandRepo = new BrandRepository(db);
const workspaceRepo = new WorkspaceRepository(db);

export function requireBrandAccess(allowedRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER']) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const rawBrandId = req.params.brandId;
    const brandId = Array.isArray(rawBrandId) ? rawBrandId[0] : rawBrandId;

    if (!brandId) {
      return next(new AppError('Brand ID parameter is missing', 400, 'BAD_REQUEST'));
    }

    try {
      const brand = await brandRepo.findById(brandId);
      if (!brand) {
        return next(new AppError('Brand not found', 404, 'BRAND_NOT_FOUND'));
      }

      // Check if user is an authorized member of the brand's workspace
      const role = await workspaceRepo.getUserRole(brand.workspaceId, req.user.id);
      if (!role) {
        return next(
          new AppError(
            'You do not have access to this brand (Workspace isolation enforced)',
            403,
            'WORKSPACE_ACCESS_DENIED'
          )
        );
      }

      if (!allowedRoles.includes(role)) {
        return next(
          new AppError(
            `Insufficient permissions. Required role: [${allowedRoles.join(', ')}], your role: ${role}`,
            403,
            'INSUFFICIENT_PERMISSIONS'
          )
        );
      }

      req.brand = brand;
      req.workspaceRole = role;
      req.activeWorkspaceId = brand.workspaceId;
      next();
    } catch (error) {
      next(error);
    }
  };
}
