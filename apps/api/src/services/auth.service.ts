import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  UserRepository,
  SessionRepository,
  WorkspaceRepository,
  getDatabase
} from '@vidsnapai/database';
import type { User, WorkspaceWithMembers } from '@vidsnapai/types';
import type { SignupInput, LoginInput } from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export const SESSION_COOKIE_NAME = 'vidsnap_session';
export const SESSION_EXPIRY_DAYS = 30;

export function hashToken(token: string): string {
  if (!token || typeof token !== 'string') {
    return '';
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;
  private workspaceRepo: WorkspaceRepository;

  constructor(db = getDatabase()) {
    this.userRepo = new UserRepository(db);
    this.sessionRepo = new SessionRepository(db);
    this.workspaceRepo = new WorkspaceRepository(db);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async signup(input: SignupInput): Promise<{
    user: User;
    rawToken: string;
    workspace: WorkspaceWithMembers;
  }> {
    const existing = await this.userRepo.existsByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      name: input.name
    });

    // Automatically create default personal workspace for the user
    const defaultWorkspaceName = `${user.name.split(' ')[0]}'s Workspace`;
    const workspace = await this.workspaceRepo.create({
      name: defaultWorkspaceName,
      ownerId: user.id
    });

    // Create session
    const rawToken = this.generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await this.sessionRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt
    });

    return { user, rawToken, workspace };
  }

  async login(input: LoginInput): Promise<{ user: User; rawToken: string }> {
    const userWithHash = await this.userRepo.findByEmail(input.email);
    if (!userWithHash) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await this.verifyPassword(input.password, userWithHash.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const rawToken = this.generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    await this.sessionRepo.create({
      userId: userWithHash.id,
      tokenHash,
      expiresAt
    });

    const { passwordHash: _, ...safeUser } = userWithHash;
    return { user: safeUser, rawToken };
  }

  async logout(rawToken: string): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    await this.sessionRepo.deleteByTokenHash(tokenHash);
  }

  async validateSession(rawToken: string): Promise<{ user: User; sessionExpiresAt: Date } | null> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      return null;
    }
    const cleanToken = rawToken.trim();
    const tokenHash = hashToken(cleanToken);
    if (!tokenHash) return null;

    try {
      const session = await this.sessionRepo.findByTokenHash(tokenHash);
      if (!session || !session.userId) return null;

      const user = await this.userRepo.findById(session.userId);
      if (!user) {
        await this.sessionRepo.delete(session.id).catch(() => {});
        return null;
      }

      return { user, sessionExpiresAt: session.expiresAt };
    } catch (err) {
      console.error('[AuthService.validateSession error]', err);
      return null;
    }
  }
}
