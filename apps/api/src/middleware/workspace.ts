import type { Request, Response, NextFunction } from 'express';
import type { WorkspaceRole } from '@vidsnapai/types';
import { WorkspaceRepository, getDatabase } from '@vidsnapai/database';
import { AppError } from './error-handler.js';

const workspaceRepo = new WorkspaceRepository(getDatabase());

export async function verifyUserWorkspaceAccess(
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER']
): Promise<WorkspaceRole> {
  const role = await workspaceRepo.getUserRole(workspaceId, userId);
  if (!role) {
    throw new AppError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
  }

  if (!allowedRoles.includes(role)) {
    throw new AppError(
      `Insufficient permissions. Required role: [${allowedRoles.join(', ')}], your role: ${role}`,
      403,
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  return role;
}

export async function getVerifiedWorkspaceId(
  req: Request,
  allowedRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER']
): Promise<string> {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const rawWsId =
    (req.headers['x-workspace-id'] as string) ||
    (req.query.workspaceId as string) ||
    (req.body?.workspaceId as string) ||
    req.params.workspaceId;

  if (!rawWsId) {
    throw new AppError('Workspace ID header (x-workspace-id) is required', 400, 'WORKSPACE_REQUIRED');
  }

  const workspaceId = Array.isArray(rawWsId) ? rawWsId[0] : rawWsId;
  const role = await verifyUserWorkspaceAccess(workspaceId, req.user.id, allowedRoles);
  req.workspaceRole = role;
  return workspaceId;
}

export function requireWorkspaceRole(allowedRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER']) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const rawId = req.params.workspaceId || req.params.id;
    const workspaceId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!workspaceId) {
      return next(new AppError('Workspace ID parameter is missing', 400, 'BAD_REQUEST'));
    }

    try {
      const role = await verifyUserWorkspaceAccess(workspaceId, req.user.id, allowedRoles);
      req.workspaceRole = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}
