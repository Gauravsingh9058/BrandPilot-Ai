import { Router, type Request, type Response, type NextFunction } from 'express';
import { CreateWorkspaceSchema, AddWorkspaceMemberSchema } from '@vidsnapai/validation';
import { WorkspaceService } from '../services/workspace.service.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceRole } from '../middleware/workspace.js';
import type { ApiResponse } from '@vidsnapai/types';

export const workspaceRouter: Router = Router();
const workspaceService = new WorkspaceService();

// All workspace routes require an authenticated user
workspaceRouter.use(requireAuth);

// POST /api/workspaces - Create a new workspace
workspaceRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = CreateWorkspaceSchema.parse(req.body);
    const workspace = await workspaceService.createWorkspace(req.user!.id, validatedInput);

    const response: ApiResponse = {
      success: true,
      data: { workspace },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces - List workspaces current user is a member of
workspaceRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaces = await workspaceService.listWorkspacesForUser(req.user!.id);

    const response: ApiResponse = {
      success: true,
      data: { workspaces },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/workspaces/:id - Get workspace details & members (Members, Admins, Owners)
workspaceRouter.get(
  '/:id',
  requireWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const workspace = await workspaceService.getWorkspaceDetails(id, req.user!.id);

      const response: ApiResponse = {
        success: true,
        data: {
          workspace: {
            ...workspace,
            userRole: req.workspaceRole
          }
        },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/workspaces/:id/members - Add a member (Admins and Owners only)
workspaceRouter.post(
  '/:id/members',
  requireWorkspaceRole(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedInput = AddWorkspaceMemberSchema.parse(req.body);
      const member = await workspaceService.addMember(
        id,
        req.user!.id,
        validatedInput
      );

      const response: ApiResponse = {
        success: true,
        data: { member },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/workspaces/:id/members/:memberId - Remove a member (Admins and Owners only)
workspaceRouter.delete(
  '/:id/members/:memberId',
  requireWorkspaceRole(['OWNER', 'ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
      await workspaceService.removeMember(
        id,
        req.user!.id,
        memberId
      );

      const response: ApiResponse = {
        success: true,
        data: { message: 'Member removed from workspace successfully' },
        meta: {
          requestId: req.id,
          timestamp: new Date().toISOString()
        }
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);
