import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService, hashToken } from '../src/services/auth.service.js';
import type { Database } from '@vidsnapai/database';

describe('Auth Service Tests', () => {
  let authService: AuthService;
  let mockDb: any;

  // In-memory data tables for testing
  let usersTable: any[] = [];
  let sessionsTable: any[] = [];
  let workspacesTable: any[] = [];
  let workspaceMembersTable: any[] = [];

  beforeEach(() => {
    usersTable = [];
    sessionsTable = [];
    workspacesTable = [];
    workspaceMembersTable = [];

    mockDb = {
      insert: (table: any) => ({
        values: (data: any) => ({
          returning: async () => {
            const row = {
              id: `id-${Math.random().toString(36).substring(2, 9)}`,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            if (table.email) {
              usersTable.push(row);
            } else if (table.tokenHash) {
              sessionsTable.push(row);
            } else if (table.ownerId) {
              workspacesTable.push(row);
            } else if (table.workspaceId) {
              workspaceMembersTable.push(row);
            }
            return [row];
          }
        })
      }),
      select: (_fields?: any) => ({
        from: (table: any) => ({
          where: (clause: any) => ({
            limit: async (_limit: number) => {
              if (table.email) {
                // Find by email or id
                return usersTable.filter((u) => u.email === clause?.val || u.id === clause?.val);
              }
              if (table.tokenHash) {
                return sessionsTable.filter((s) => s.tokenHash === clause?.val);
              }
              if (table.ownerId) {
                return workspacesTable.filter((w) => w.id === clause?.val);
              }
              return [];
            }
          })
        })
      }),
      delete: (table: any) => ({
        where: async (clause: any) => {
          if (table.tokenHash) {
            sessionsTable = sessionsTable.filter((s) => s.tokenHash !== clause?.val);
          } else if (table.id) {
            sessionsTable = sessionsTable.filter((s) => s.id !== clause?.val);
          }
          return { rowCount: 1 };
        }
      }),
      transaction: async (cb: any) => cb(mockDb)
    };

    authService = new AuthService(mockDb as unknown as Database);
  });

  describe('1. Password Hashing', () => {
    it('generates secure salted hashes that verify correctly', async () => {
      const password = 'SuperSecurePassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('2. Signup & Workspace Initialization', () => {
    it('creates a user, session, and default personal workspace on signup', async () => {
      const input = {
        name: 'Sarah Connor',
        email: 'sarah@skynet.com',
        password: 'Password123'
      };

      const result = await authService.signup(input);

      expect(result.user.email).toBe('sarah@skynet.com');
      expect(result.user.name).toBe('Sarah Connor');
      expect(result.rawToken).toBeDefined();
      expect(result.workspace).toBeDefined();
      expect(result.workspace.name).toBe("Sarah's Workspace");
      expect(result.workspace.userRole).toBe('OWNER');
    });

    it('rejects signup if email already exists', async () => {
      const input = {
        name: 'Sarah Connor',
        email: 'sarah@skynet.com',
        password: 'Password123'
      };

      // Mock user existence
      vi.spyOn(authService['userRepo'], 'existsByEmail').mockResolvedValue(true);

      await expect(authService.signup(input)).rejects.toThrow('already exists');
    });
  });

  describe('3. Login & Credential Verification', () => {
    it('authenticates valid credentials and generates session token', async () => {
      const password = 'CorrectPassword123';
      const hash = await bcrypt.hash(password, 10);

      vi.spyOn(authService['userRepo'], 'findByEmail').mockResolvedValue({
        id: 'user-123',
        email: 'sarah@skynet.com',
        name: 'Sarah Connor',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await authService.login({
        email: 'sarah@skynet.com',
        password: 'CorrectPassword123'
      });

      expect(result.user.id).toBe('user-123');
      expect(result.rawToken).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('rejects invalid password with safe error', async () => {
      const hash = await bcrypt.hash('CorrectPassword123', 10);

      vi.spyOn(authService['userRepo'], 'findByEmail').mockResolvedValue({
        id: 'user-123',
        email: 'sarah@skynet.com',
        name: 'Sarah Connor',
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(
        authService.login({
          email: 'sarah@skynet.com',
          password: 'IncorrectPassword'
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('4. Logout & Session Invalidation', () => {
    it('deletes session on logout', async () => {
      const deleteSpy = vi.spyOn(authService['sessionRepo'], 'deleteByTokenHash').mockResolvedValue();
      await authService.logout('raw-session-token');
      expect(deleteSpy).toHaveBeenCalledWith(hashToken('raw-session-token'));
    });
  });

  describe('5. Session Validation', () => {
    it('validates active session and retrieves user', async () => {
      const token = 'active-token';
      const tokenH = hashToken(token);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      vi.spyOn(authService['sessionRepo'], 'findByTokenHash').mockResolvedValue({
        id: 'session-1',
        userId: 'user-123',
        tokenHash: tokenH,
        expiresAt,
        createdAt: new Date()
      });

      vi.spyOn(authService['userRepo'], 'findById').mockResolvedValue({
        id: 'user-123',
        email: 'sarah@skynet.com',
        name: 'Sarah Connor',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const session = await authService.validateSession(token);
      expect(session).not.toBeNull();
      expect(session?.user.id).toBe('user-123');
    });
  });
});
