import {
  WorkspaceRepository,
  UserRepository,
  getDatabase
} from '@vidsnapai/database';
import type { Workspace, WorkspaceWithMembers, WorkspaceMember, WorkspaceRole } from '@vidsnapai/types';
import type { CreateWorkspaceInput, AddWorkspaceMemberInput } from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export class WorkspaceService {
  private workspaceRepo: WorkspaceRepository;
  private userRepo: UserRepository;

  constructor(db = getDatabase()) {
    this.workspaceRepo = new WorkspaceRepository(db);
    this.userRepo = new UserRepository(db);
  }

  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceWithMembers> {
    return this.workspaceRepo.create({
      name: input.name,
      ownerId: userId
    });
  }

  async listWorkspacesForUser(userId: string): Promise<(Workspace & { role: WorkspaceRole; memberCount: number })[]> {
    return this.workspaceRepo.listForUser(userId);
  }

  async getWorkspaceDetails(workspaceId: string, currentUserId: string): Promise<WorkspaceWithMembers> {
    const workspace = await this.workspaceRepo.findByIdWithMembers(workspaceId, currentUserId);
    if (!workspace) {
      throw new AppError('Workspace not found', 404, 'NOT_FOUND');
    }
    return workspace;
  }

  async addMember(
    workspaceId: string,
    _actorUserId: string,
    input: AddWorkspaceMemberInput
  ): Promise<WorkspaceMember> {
    const targetUser = await this.userRepo.findByEmail(input.email);
    if (!targetUser) {
      throw new AppError(
        'User with this email is not registered in VidSnapAI. They must sign up first.',
        404,
        'USER_NOT_FOUND'
      );
    }

    const existingRole = await this.workspaceRepo.getUserRole(workspaceId, targetUser.id);
    if (existingRole) {
      throw new AppError('This user is already a member of this workspace', 409, 'ALREADY_MEMBER');
    }

    return this.workspaceRepo.addMember(workspaceId, targetUser.id, input.role);
  }

  async removeMember(
    workspaceId: string,
    _actorUserId: string,
    memberId: string
  ): Promise<void> {
    const member = await this.workspaceRepo.getMemberById(memberId);
    if (!member || member.workspaceId !== workspaceId) {
      throw new AppError('Member not found in this workspace', 404, 'MEMBER_NOT_FOUND');
    }

    if (member.role === 'OWNER') {
      throw new AppError('Cannot remove workspace owner from workspace', 400, 'CANNOT_REMOVE_OWNER');
    }

    const success = await this.workspaceRepo.removeMember(workspaceId, memberId);
    if (!success) {
      throw new AppError('Failed to remove workspace member', 500, 'DELETE_FAILED');
    }
  }
}
