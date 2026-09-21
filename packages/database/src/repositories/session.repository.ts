import { eq, lt } from 'drizzle-orm';
import type { Database } from '../client.js';
import { sessions, type SessionRow } from '../schema/index.js';
import type { Session } from '@vidsnapai/types';

export function mapSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt
  };
}

export class SessionRepository {
  constructor(private db: Database) {}

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<Session> {
    const [inserted] = await this.db
      .insert(sessions)
      .values({
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt
      })
      .returning();
    return mapSessionRow(inserted);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const [found] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);

    if (!found) return null;
    if (new Date() > found.expiresAt) {
      // Lazy cleanup of expired session
      await this.delete(found.id);
      return null;
    }
    return mapSessionRow(found);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  async cleanExpired(): Promise<number> {
    const result = await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    return result.rowCount ?? 0;
  }
}
