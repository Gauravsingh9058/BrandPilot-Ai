import type { Database } from '@vidsnapai/database';
import { AutonomousRepository } from '@vidsnapai/database';
import type {
  AutonomousPolicy,
  AutonomousOperatingMode,
  AutonomousOperationsStatus
} from '@vidsnapai/types';


export class AutonomousPolicyService {
  private autonRepo: AutonomousRepository;

  constructor(
    private db: Database,
    options?: { autonRepo?: AutonomousRepository }
  ) {
    this.autonRepo = options?.autonRepo || new AutonomousRepository(db);
  }

  /**
   * Fetch or initialize policy for a workspace.
   */
  async getPolicy(workspaceId: string): Promise<AutonomousPolicy> {
    return this.autonRepo.getOrCreatePolicy(workspaceId);
  }

  /**
   * Update policy configuration.
   */
  async updatePolicy(
    workspaceId: string,
    updates: Partial<Omit<AutonomousPolicy, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
    executedBy: string = 'USER'
  ): Promise<AutonomousPolicy> {
    const updated = await this.autonRepo.updatePolicy(workspaceId, updates);

    await this.autonRepo.recordExecutionHistory({
      workspaceId,
      brandId: '00000000-0000-0000-0000-000000000000',
      actionType: 'POLICY_UPDATE',
      targetEntity: 'WORKSPACE_POLICY',
      targetId: workspaceId,
      status: 'SUCCESS',
      reason: `Policy updated with fields: ${Object.keys(updates).join(', ')}`,
      executionResult: updates as Record<string, unknown>,
      executedBy
    });

    return updated;
  }

  /**
   * Switch operating mode between AUTONOMOUS and CONTROLLED.
   */
  async setOperatingMode(
    workspaceId: string,
    mode: AutonomousOperatingMode,
    executedBy: string = 'USER'
  ): Promise<AutonomousPolicy> {
    const updated = await this.autonRepo.updatePolicy(workspaceId, { mode });

    await this.autonRepo.recordExecutionHistory({
      workspaceId,
      brandId: '00000000-0000-0000-0000-000000000000',
      actionType: 'MODE_CHANGE',
      targetEntity: 'WORKSPACE_POLICY',
      targetId: workspaceId,
      status: 'SUCCESS',
      reason: `Operating mode changed to ${mode}`,
      executionResult: { mode },
      executedBy
    });

    return updated;
  }

  /**
   * Emergency Pause all autonomous operations for a workspace.
   */
  async emergencyPause(
    workspaceId: string,
    reason: string = 'Emergency pause triggered',
    executedBy: string = 'USER'
  ): Promise<AutonomousPolicy> {
    const updated = await this.autonRepo.updatePolicy(workspaceId, { status: 'PAUSED' });

    await this.autonRepo.recordSafetyEvent({
      workspaceId,
      eventType: 'EMERGENCY_PAUSE_TRIGGERED',
      severity: 'CRITICAL',
      description: reason,
      blockedAction: 'ALL_AUTONOMOUS_ACTIONS',
      details: { executedBy, timestamp: new Date().toISOString() }
    });

    await this.autonRepo.recordExecutionHistory({
      workspaceId,
      brandId: '00000000-0000-0000-0000-000000000000',
      actionType: 'EMERGENCY_PAUSE',
      targetEntity: 'WORKSPACE_POLICY',
      targetId: workspaceId,
      status: 'SUCCESS',
      reason,
      executedBy
    });

    return updated;
  }

  /**
   * Resume paused autonomous operations.
   */
  async resumeOperations(
    workspaceId: string,
    executedBy: string = 'USER'
  ): Promise<AutonomousPolicy> {
    const updated = await this.autonRepo.updatePolicy(workspaceId, { status: 'ACTIVE' });

    await this.autonRepo.recordExecutionHistory({
      workspaceId,
      brandId: '00000000-0000-0000-0000-000000000000',
      actionType: 'POLICY_UPDATE',
      targetEntity: 'WORKSPACE_POLICY',
      targetId: workspaceId,
      status: 'SUCCESS',
      reason: 'Autonomous operations resumed to ACTIVE',
      executedBy
    });

    return updated;
  }

  /**
   * Get full operational status including today's limits usage, safety events, and last run.
   */
  async getOperationsStatus(workspaceId: string): Promise<AutonomousOperationsStatus> {
    const policy = await this.getPolicy(workspaceId);
    const todayLimits = await this.autonRepo.getOrCreateLimits(workspaceId);
    const recentRuns = await this.autonRepo.listRuns(workspaceId, { limit: 1 });
    const safetyEvents = await this.autonRepo.listSafetyEvents(workspaceId, { limit: 10 });

    const lastRun = recentRuns[0];
    const activeRun = lastRun && lastRun.status === 'RUNNING' ? lastRun : undefined;

    return {
      workspaceId,
      mode: policy.mode,
      status: policy.status,
      policy,
      todayUsage: {
        date: todayLimits.date,
        dailySpend: todayLimits.dailySpend,
        dailySpendLimit: policy.advertising.maxDailySpend,
        campaignsCreated: todayLimits.campaignsCreated,
        maxCampaignsPerDay: policy.advertising.maxCampaignsPerDay,
        adsCreated: todayLimits.adsCreated,
        maxNewAdsPerDay: policy.advertising.maxNewAdsPerDay,
        reelsCreated: todayLimits.reelsCreated,
        reelsRendered: todayLimits.reelsRendered,
        reelsPublished: todayLimits.reelsPublished,
        optimizationsApplied: todayLimits.optimizationsApplied,
        conversionsToday: 0,
        roasToday: 0
      },
      lastRun,
      activeRun,
      recentSafetyEvents: safetyEvents
    };
  }
}
