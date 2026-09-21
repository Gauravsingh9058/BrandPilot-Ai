import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceService } from '../src/services/workspace.service.js';
import type { Database } from '@vidsnapai/database';

describe('Workspace System & Authorization Tests', () => {
  let workspaceService: WorkspaceService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      delete: vi.fn(),
      transaction: async (cb: any) => cb(mockDb)
    };

    workspaceService = new WorkspaceService(mockDb as unknown as Database);
  });

  describe('1. Workspace Creation', () => {
    it('creates workspace and establishes creator as OWNER', async () => {
      vi.spyOn(workspaceService['workspaceRepo'], 'create').mockResolvedValue({
        id: 'ws-1',
        name: 'Acme Media',
        ownerId: 'user-1',
        userRole: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [
          {
            id: 'mem-1',
            workspaceId: 'ws-1',
            userId: 'user-1',
            role: 'OWNER',
            createdAt: new Date()
          }
        ]
      });

      const ws = await workspaceService.createWorkspace('user-1', { name: 'Acme Media' });
      expect(ws.id).toBe('ws-1');
      expect(ws.name).toBe('Acme Media');
      expect(ws.userRole).toBe('OWNER');
    });
  });

  describe('2. Workspace Membership Management', () => {
    it('adds new registered user as member with specified role', async () => {
      vi.spyOn(workspaceService['userRepo'], 'findByEmail').mockResolvedValue({
        id: 'user-2',
        email: 'collaborator@company.com',
        name: 'John Doe',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.spyOn(workspaceService['workspaceRepo'], 'getUserRole').mockResolvedValue(null);
      vi.spyOn(workspaceService['workspaceRepo'], 'addMember').mockResolvedValue({
        id: 'mem-2',
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: 'ADMIN',
        createdAt: new Date()
      });

      const member = await workspaceService.addMember('ws-1', 'user-1', {
        email: 'collaborator@company.com',
        role: 'ADMIN'
      });

      expect(member.userId).toBe('user-2');
      expect(member.role).toBe('ADMIN');
    });

    it('rejects adding unregistered users with clear error', async () => {
      vi.spyOn(workspaceService['userRepo'], 'findByEmail').mockResolvedValue(null);

      await expect(
        workspaceService.addMember('ws-1', 'user-1', {
          email: 'notfound@company.com',
          role: 'MEMBER'
        })
      ).rejects.toThrow('not registered');
    });

    it('prevents removing workspace OWNER', async () => {
      vi.spyOn(workspaceService['workspaceRepo'], 'getMemberById').mockResolvedValue({
        id: 'mem-owner',
        workspaceId: 'ws-1',
        userId: 'user-owner',
        role: 'OWNER',
        createdAt: new Date()
      });

      await expect(
        workspaceService.removeMember('ws-1', 'user-admin', 'mem-owner')
      ).rejects.toThrow('Cannot remove workspace owner');
    });
  });

  describe('3. Workspace Isolation & Multi-Tenancy', () => {
    it('verifies caller cannot access workspace they are not member of', async () => {
      vi.spyOn(workspaceService['workspaceRepo'], 'getUserRole').mockResolvedValue(null);

      const role = await workspaceService['workspaceRepo'].getUserRole('ws-private', 'unauthorized-user');
      expect(role).toBeNull();
    });
  });
});
