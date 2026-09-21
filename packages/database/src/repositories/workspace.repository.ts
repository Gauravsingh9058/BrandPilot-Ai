import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.js';
import { workspaces, workspaceMembers, users, type WorkspaceRow } from '../schema/index.js';
import type { Workspace, WorkspaceMember, WorkspaceWithMembers, WorkspaceRole } from '@vidsnapai/types';

export function mapWorkspaceRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class WorkspaceRepository {
  constructor(private db: Database) {}

  async create(data: { name: string; ownerId: string }): Promise<WorkspaceWithMembers> {
    return await this.db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: data.name,
          ownerId: data.ownerId
        })
        .returning();

      const [member] = await tx
        .insert(workspaceMembers)
        .values({
          workspaceId: workspace.id,
          userId: data.ownerId,
          role: 'OWNER'
        })
        .returning();

      return {
        ...mapWorkspaceRow(workspace),
        userRole: 'OWNER',
        members: [
          {
            id: member.id,
            workspaceId: member.workspaceId,
            userId: member.userId,
            role: member.role as WorkspaceRole,
            createdAt: member.createdAt
          }
        ]
      };
    });
  }

  async findById(workspaceId: string): Promise<Workspace | null> {
    const [found] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    return found ? mapWorkspaceRow(found) : null;
  }

  async findByIdWithMembers(workspaceId: string, currentUserId?: string): Promise<WorkspaceWithMembers | null> {
    const [workspace] = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) return null;

    const memberRows = await this.db
      .select({
        memberId: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        createdAt: workspaceMembers.createdAt,
        userName: users.name,
        userEmail: users.email
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    let userRole: WorkspaceRole | undefined;
    const members: WorkspaceMember[] = memberRows.map((r) => {
      if (currentUserId && r.userId === currentUserId) {
        userRole = r.role as WorkspaceRole;
      }
      return {
        id: r.memberId,
        workspaceId: r.workspaceId,
        userId: r.userId,
        role: r.role as WorkspaceRole,
        createdAt: r.createdAt,
        user: {
          id: r.userId,
          name: r.userName,
          email: r.userEmail
        }
      };
    });

    return {
      ...mapWorkspaceRow(workspace),
      userRole,
      members
    };
  }

  async listForUser(userId: string): Promise<(Workspace & { role: WorkspaceRole; memberCount: number })[]> {
    const memberships = await this.db
      .select({
        workspaceId: workspaces.id,
        name: workspaces.name,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: workspaceMembers.role
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    const results = await Promise.all(
      memberships.map(async (ws) => {
        const members = await this.db
          .select({ id: workspaceMembers.id })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, ws.workspaceId));

        return {
          id: ws.workspaceId,
          name: ws.name,
          ownerId: ws.ownerId,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
          role: ws.role as WorkspaceRole,
          memberCount: members.length
        };
      })
    );

    return results;
  }

  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const [membership] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    return (membership?.role as WorkspaceRole) || null;
  }

  async addMember(workspaceId: string, userId: string, role: 'ADMIN' | 'MEMBER'): Promise<WorkspaceMember> {
    const [member] = await this.db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId,
        role
      })
      .returning();

    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role as WorkspaceRole,
      createdAt: member.createdAt
    };
  }

  async removeMember(workspaceId: string, memberId: string): Promise<boolean> {
    const result = await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  async getMemberById(memberId: string): Promise<WorkspaceMember | null> {
    const [member] = await this.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.id, memberId))
      .limit(1);

    if (!member) return null;
    return {
      id: member.id,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role as WorkspaceRole,
      createdAt: member.createdAt
    };
  }
}
