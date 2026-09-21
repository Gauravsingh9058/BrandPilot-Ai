import { eq } from 'drizzle-orm';
import type { Database } from '../client.js';
import { users, type UserRow } from '../schema/index.js';
import type { User, UserWithPasswordHash } from '@vidsnapai/types';

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapUserWithHashRow(row: UserRow): UserWithPasswordHash {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class UserRepository {
  constructor(private db: Database) {}

  async create(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    const [inserted] = await this.db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name
      })
      .returning();
    return mapUserRow(inserted);
  }

  async findByEmail(email: string): Promise<UserWithPasswordHash | null> {
    const [found] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return found ? mapUserWithHashRow(found) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [found] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return found ? mapUserRow(found) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const [found] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return !!found;
  }
}
