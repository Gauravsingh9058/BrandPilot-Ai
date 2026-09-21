import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../apps/api/src/services/auth.service.js';
import { WorkspaceService } from '../apps/api/src/services/workspace.service.js';
import type { Database } from '@vidsnapai/database';
import type { User, WorkspaceWithMembers, Session } from '@vidsnapai/types';

describe('VidSnapAI Phase 1 Full Lifecycle Integration', () => {
  let authService: AuthService;
  let workspaceService: WorkspaceService;

  // In-memory data store
  let users: User[] = [];
  const userPasswords: Map<string, string> = new Map();
  let sessions: Session[] = [];
  let workspaces: WorkspaceWithMembers[] = [];

  beforeEach(() => {
    users = [];
    userPasswords.clear();
    sessions = [];
    workspaces = [];

    const mockDb = {} as Database;
    authService = new AuthService(mockDb);
    workspaceService = new WorkspaceService(mockDb);

    // Mock UserRepository
    vi.spyOn(authService['userRepo'], 'existsByEmail').mockImplementation(async (email) => {
      return users.some((u) => u.email === email.toLowerCase());
    });

    vi.spyOn(authService['userRepo'], 'create').mockImplementation(async (data) => {
      const id = `user-${Math.random().toString(36).substring(2, 9)}`;
      const user: User = {
        id,
        email: data.email.toLowerCase(),
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.push(user);
      userPasswords.set(id, data.passwordHash);
      return user;
    });

    vi.spyOn(authService['userRepo'], 'findByEmail').mockImplementation(async (email) => {
      const user = users.find((u) => u.email === email.toLowerCase());
      if (!user) return null;
      return {
        ...user,
        passwordHash: userPasswords.get(user.id)!
      };
    });

    vi.spyOn(authService['userRepo'], 'findById').mockImplementation(async (id) => {
      return users.find((u) => u.id === id) || null;
    });

    // Mock SessionRepository
    vi.spyOn(authService['sessionRepo'], 'create').mockImplementation(async (data) => {
      const session: Session = {
        id: `sess-${Math.random().toString(36).substring(2, 9)}`,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        createdAt: new Date()
      };
      sessions.push(session);
      return session;
    });

    vi.spyOn(authService['sessionRepo'], 'findByTokenHash').mockImplementation(async (tokenHash) => {
      const session = sessions.find((s) => s.tokenHash === tokenHash);
      if (!session) return null;
      if (new Date() > session.expiresAt) {
        sessions = sessions.filter((s) => s.id !== session.id);
        return null;
      }
      return session;
    });

    vi.spyOn(authService['sessionRepo'], 'deleteByTokenHash').mockImplementation(async (tokenHash) => {
      sessions = sessions.filter((s) => s.tokenHash !== tokenHash);
    });

    // Mock WorkspaceRepository
    vi.spyOn(authService['workspaceRepo'], 'create').mockImplementation(async (data) => {
      const id = `ws-${Math.random().toString(36).substring(2, 9)}`;
      const ws: WorkspaceWithMembers = {
        id,
        name: data.name,
        ownerId: data.ownerId,
        userRole: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: `mem-${Math.random().toString(36).substring(2, 9)}`,
            workspaceId: id,
            userId: data.ownerId,
            role: 'OWNER',
            createdAt: new Date()
          }
        ]
      };
      workspaces.push(ws);
      return ws;
    });

    vi.spyOn(workspaceService['workspaceRepo'], 'create').mockImplementation(async (data) => {
      const id = `ws-${Math.random().toString(36).substring(2, 9)}`;
      const ws: WorkspaceWithMembers = {
        id,
        name: data.name,
        ownerId: data.ownerId,
        userRole: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: []
      };
      workspaces.push(ws);
      return ws;
    });

    vi.spyOn(workspaceService['workspaceRepo'], 'listForUser').mockImplementation(async (userId) => {
      return workspaces
        .filter((w) => w.ownerId === userId || w.members.some((m) => m.userId === userId))
        .map((w) => ({
          ...w,
          role: w.userRole || 'OWNER',
          memberCount: w.members.length
        }));
    });
  });

  it('executes the full user lifecycle: signup -> workspace -> login -> logout', async () => {
    // 1. User Signs Up
    const signupResult = await authService.signup({
      name: 'Elena Rostova',
      email: 'elena@vidsnapai.com',
      password: 'StrongPassword123'
    });

    expect(signupResult.user.email).toBe('elena@vidsnapai.com');
    expect(signupResult.rawToken).toBeDefined();
    expect(signupResult.workspace.name).toBe("Elena's Workspace");
    expect(signupResult.workspace.userRole).toBe('OWNER');

    // 2. Validate Session
    const sessionData = await authService.validateSession(signupResult.rawToken);
    expect(sessionData).not.toBeNull();
    expect(sessionData?.user.email).toBe('elena@vidsnapai.com');

    // 3. User Logs In with Credentials
    const loginResult = await authService.login({
      email: 'elena@vidsnapai.com',
      password: 'StrongPassword123'
    });

    expect(loginResult.user.id).toBe(signupResult.user.id);
    expect(loginResult.rawToken).toBeDefined();

    // 4. Create an additional workspace
    const newWs = await workspaceService.createWorkspace(loginResult.user.id, {
      name: 'Agency Studio'
    });
    expect(newWs.name).toBe('Agency Studio');

    // 5. User Lists Workspaces
    const userWorkspaces = await workspaceService.listWorkspacesForUser(loginResult.user.id);
    expect(userWorkspaces.length).toBeGreaterThanOrEqual(1);

    // 6. User Logs Out
    await authService.logout(loginResult.rawToken);
    const sessionAfterLogout = await authService.validateSession(loginResult.rawToken);
    expect(sessionAfterLogout).toBeNull();
  });
});
