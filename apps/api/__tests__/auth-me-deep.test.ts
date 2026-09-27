import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import cookieParser from 'cookie-parser';
import { authRouter } from '../src/routes/auth.routes.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { AuthService, SESSION_COOKIE_NAME, hashToken } from '../src/services/auth.service.js';
import { WorkspaceService } from '../src/services/workspace.service.js';
import type { User, Session, Workspace, WorkspaceRole } from '@vidsnapai/types';

describe('GET /api/auth/me Deep Root Cause & Gateway Defect Immunity Tests', () => {
  let app: express.Application;
  let server: Server;
  let baseUrl: string;

  let users: User[] = [];
  let sessions: Session[] = [];
  let workspaces: (Workspace & { role: WorkspaceRole; memberCount: number })[] = [];

  const validUserId = 'a0000000-0000-0000-0000-000000000001';
  const validRawToken = 'valid-production-session-token-12345';
  const validTokenHash = hashToken(validRawToken);

  beforeEach(async () => {
    users = [
      {
        id: validUserId,
        email: 'founder@brandpilot.ai',
        name: 'BrandPilot Founder',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    sessions = [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        userId: validUserId,
        tokenHash: validTokenHash,
        expiresAt,
        createdAt: new Date()
      }
    ];

    workspaces = [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        name: "Founder's Workspace",
        ownerId: validUserId,
        role: 'OWNER',
        memberCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Mock AuthService and WorkspaceService methods
    vi.spyOn(AuthService.prototype, 'validateSession').mockImplementation(async (rawToken: string) => {
      if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) return null;
      const th = hashToken(rawToken);
      const session = sessions.find((s) => s.tokenHash === th);
      if (!session) return null;
      if (new Date() > session.expiresAt) return null;
      const user = users.find((u) => u.id === session.userId);
      if (!user) return null;
      return { user, sessionExpiresAt: session.expiresAt };
    });

    vi.spyOn(WorkspaceService.prototype, 'listWorkspacesForUser').mockImplementation(async (userId: string) => {
      return workspaces.filter((w) => w.ownerId === userId);
    });

    vi.spyOn(WorkspaceService.prototype, 'createWorkspace').mockImplementation(async (userId: string, input: any) => {
      const created = {
        id: 'c0000000-0000-0000-0000-000000000099',
        name: input.name,
        ownerId: userId,
        role: 'OWNER' as WorkspaceRole,
        memberCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        userRole: 'OWNER' as WorkspaceRole,
        members: []
      };
      workspaces.push(created);
      return created as any;
    });

    app = express();
    app.use(express.json());
    app.use(cookieParser('test-session-secret'));
    app.use('/api/auth', authRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. Returns 401 UNAUTHORIZED when no cookie or authorization header is provided', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('2. Returns 401 SESSION_EXPIRED and clears cookie when token is invalid or unknown', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=unknown_stale_token_xyz`
      }
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SESSION_EXPIRED');
    
    // Verifies stale cookie is cleared from browser
    const setCookieHeader = res.headers.get('set-cookie');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain(`${SESSION_COOKIE_NAME}=;`);
  });

  it('3. Returns 401 and never 500 when signed cookie format with invalid signature is provided', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=s%3Abadtoken.badsig`
      }
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('4. Returns 401 SESSION_EXPIRED when session is expired in database', async () => {
    // Make session expired
    sessions[0].expiresAt = new Date(Date.now() - 100000);

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${validRawToken}`
      }
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SESSION_EXPIRED');
  });

  it('5. Returns 401 SESSION_EXPIRED when user no longer exists (orphaned session)', async () => {
    // Remove user from DB
    users = [];

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${validRawToken}`
      }
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('SESSION_EXPIRED');
  });

  it('6. Returns 200 OK with authenticated user and workspace list for valid cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${validRawToken}`
      }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user).toBeDefined();
    expect(json.data.user.id).toBe(validUserId);
    expect(json.data.user.email).toBe('founder@brandpilot.ai');
    expect(json.data.workspaces).toBeInstanceOf(Array);
    expect(json.data.workspaces.length).toBe(1);
    expect(json.data.workspaces[0].name).toBe("Founder's Workspace");
  });

  it('7. Returns 200 OK with Authorization Bearer header', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${validRawToken}`
      }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.id).toBe(validUserId);
  });

  it('8. Auto-heals and returns 200 OK with default workspace when user has 0 workspaces', async () => {
    workspaces = []; // Simulate user having 0 workspaces

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${validRawToken}`
      }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.workspaces.length).toBe(1);
    expect(json.data.workspaces[0].name).toBe("BrandPilot's Workspace");
    expect(json.data.workspaces[0].role).toBe('OWNER');
  });
});
