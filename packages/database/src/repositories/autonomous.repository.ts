import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../client.js';
import {
  autonomousPolicies,
  autonomousRuns,
  autonomousRunSteps,
  autonomousExecutionHistory,
  autonomousLimits,
  autonomousBudgetEvents,
  autonomousSafetyEvents,
  type AutonomousPolicyRow,
  type AutonomousRunRow,
  type AutonomousRunStepRow,
  type AutonomousExecutionHistoryRow,
  type AutonomousLimitsRow,
  type AutonomousBudgetEventRow,
  type AutonomousSafetyEventRow
} from '../schema/index.js';
import type {
  AutonomousPolicy,
  AutonomousOperatingMode,
  AutonomousPolicyStatus,
  AutonomousRun,
  AutonomousRunStep,
  AutonomousRunStatus,
  AutonomousRunStepStatus,
  AutonomousExecutionHistoryRecord,
  AutonomousLimitsTracking,
  AutonomousBudgetEvent,
  AutonomousSafetyEvent,
  AutonomousTriggerType
} from '@vidsnapai/types';

export class AutonomousRepository {
  constructor(private db: Database) {}

  // ---------------------------------------------------------------------------
  // Mapping Helpers
  // ---------------------------------------------------------------------------

  private mapPolicyToDomain(row: AutonomousPolicyRow): AutonomousPolicy {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      mode: row.mode as AutonomousOperatingMode,
      status: row.status as AutonomousPolicyStatus,
      advertising: row.advertising,
      content: row.content,
      optimization: row.optimization,
      targeting: row.targeting,
      brand: row.brand,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapRunToDomain(row: AutonomousRunRow, steps?: AutonomousRunStep[]): AutonomousRun {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      campaignId: row.campaignId || undefined,
      triggerType: row.triggerType as AutonomousTriggerType,
      status: row.status as AutonomousRunStatus,
      currentStep: row.currentStep || undefined,
      policySnapshot: (row.policySnapshot as unknown as AutonomousPolicy) || undefined,
      summary: row.summary || undefined,
      details: (row.details as Record<string, unknown>) || {},
      error: row.error || undefined,
      idempotencyKey: row.idempotencyKey || undefined,
      steps,
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapRunStepToDomain(row: AutonomousRunStepRow): AutonomousRunStep {
    return {
      id: row.id,
      runId: row.runId,
      workspaceId: row.workspaceId,
      stepName: row.stepName,
      status: row.status as AutonomousRunStepStatus,
      inputPayload: (row.inputPayload as Record<string, unknown>) || undefined,
      outputPayload: (row.outputPayload as Record<string, unknown>) || undefined,
      errorMessage: row.errorMessage || undefined,
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      createdAt: new Date(row.createdAt)
    };
  }

  private mapHistoryToDomain(row: AutonomousExecutionHistoryRow): AutonomousExecutionHistoryRecord {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      runId: row.runId || undefined,
      actionType: row.actionType,
      targetEntity: row.targetEntity,
      targetId: row.targetId || undefined,
      status: row.status as 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SKIPPED',
      reason: row.reason,
      budgetImpact: row.budgetImpact,
      executionResult: (row.executionResult as Record<string, unknown>) || {},
      errorInformation: row.errorInformation || undefined,
      idempotencyKey: row.idempotencyKey || undefined,
      executedBy: row.executedBy,
      createdAt: new Date(row.createdAt)
    };
  }

  private mapLimitsToDomain(row: AutonomousLimitsRow): AutonomousLimitsTracking {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      date: row.date,
      dailySpend: row.dailySpend,
      campaignsCreated: row.campaignsCreated,
      adsCreated: row.adsCreated,
      reelsCreated: row.reelsCreated,
      reelsRendered: row.reelsRendered,
      reelsPublished: row.reelsPublished,
      optimizationsApplied: row.optimizationsApplied,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapBudgetEventToDomain(row: AutonomousBudgetEventRow): AutonomousBudgetEvent {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      eventType: row.eventType,
      amount: row.amount,
      limitValue: row.limitValue,
      currentValue: row.currentValue,
      reason: row.reason,
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt)
    };
  }

  private mapSafetyEventToDomain(row: AutonomousSafetyEventRow): AutonomousSafetyEvent {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      brandId: row.brandId || undefined,
      eventType: row.eventType,
      severity: row.severity as 'INFO' | 'WARNING' | 'CRITICAL',
      description: row.description,
      blockedAction: row.blockedAction || undefined,
      details: (row.details as Record<string, unknown>) || {},
      resolved: row.resolved as 'YES' | 'NO',
      createdAt: new Date(row.createdAt)
    };
  }

  // ---------------------------------------------------------------------------
  // Policy Methods
  // ---------------------------------------------------------------------------

  async getOrCreatePolicy(workspaceId: string): Promise<AutonomousPolicy> {
    const existing = await this.db
      .select()
      .from(autonomousPolicies)
      .where(eq(autonomousPolicies.workspaceId, workspaceId))
      .limit(1);

    if (existing.length > 0) {
      return this.mapPolicyToDomain(existing[0]);
    }

    const inserted = await this.db
      .insert(autonomousPolicies)
      .values({
        workspaceId,
        mode: 'CONTROLLED',
        status: 'ACTIVE',
        advertising: {
          enabled: true,
          maxDailySpend: 50,
          maxCampaignSpend: 250,
          maxCampaignsPerDay: 3,
          maxNewAdsPerDay: 10
        },
        content: {
          maxReelsPerDay: 10,
          maxReelsPerCampaign: 30
        },
        optimization: {
          autoApply: true,
          allowedActions: [
            'CHANGE_HOOK',
            'CHANGE_MESSAGING_ANGLE',
            'CHANGE_CTA',
            'CHANGE_CONTENT_PILLAR',
            'CHANGE_DURATION',
            'CHANGE_VISUAL_STYLE',
            'CREATE_VARIANT',
            'REPLACE_CREATIVE',
            'PAUSE_RECOMMENDATION'
          ]
        },
        targeting: {
          allowedCountries: [],
          allowedAgeRange: {},
          allowedPlacements: []
        },
        brand: {
          enforceBrandRules: true,
          enforceBrandColors: true,
          enforceApprovedAssets: true
        }
      })
      .returning();

    return this.mapPolicyToDomain(inserted[0]);
  }

  async updatePolicy(
    workspaceId: string,
    updates: Partial<Omit<AutonomousPolicy, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>
  ): Promise<AutonomousPolicy> {
    const current = await this.getOrCreatePolicy(workspaceId);

    const mergedAdvertising = updates.advertising
      ? { ...current.advertising, ...updates.advertising }
      : current.advertising;
    const mergedContent = updates.content
      ? { ...current.content, ...updates.content }
      : current.content;
    const mergedOptimization = updates.optimization
      ? { ...current.optimization, ...updates.optimization }
      : current.optimization;
    const mergedTargeting = updates.targeting
      ? { ...current.targeting, ...updates.targeting }
      : current.targeting;
    const mergedBrand = updates.brand
      ? { ...current.brand, ...updates.brand }
      : current.brand;

    const updated = await this.db
      .update(autonomousPolicies)
      .set({
        mode: updates.mode || current.mode,
        status: updates.status || current.status,
        advertising: mergedAdvertising,
        content: mergedContent,
        optimization: mergedOptimization,
        targeting: mergedTargeting,
        brand: mergedBrand,
        updatedAt: new Date()
      })
      .where(eq(autonomousPolicies.workspaceId, workspaceId))
      .returning();

    return this.mapPolicyToDomain(updated[0]);
  }

  // ---------------------------------------------------------------------------
  // Autonomous Runs Methods
  // ---------------------------------------------------------------------------

  async createRun(params: {
    workspaceId: string;
    brandId: string;
    campaignId?: string | null;
    triggerType: AutonomousTriggerType;
    policySnapshot?: AutonomousPolicy;
    idempotencyKey?: string;
  }): Promise<AutonomousRun> {
    if (params.idempotencyKey) {
      const existing = await this.db
        .select()
        .from(autonomousRuns)
        .where(
          and(
            eq(autonomousRuns.workspaceId, params.workspaceId),
            eq(autonomousRuns.idempotencyKey, params.idempotencyKey)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const steps = await this.listRunSteps(existing[0].id, params.workspaceId);
        return this.mapRunToDomain(existing[0], steps);
      }
    }

    const inserted = await this.db
      .insert(autonomousRuns)
      .values({
        workspaceId: params.workspaceId,
        brandId: params.brandId,
        campaignId: params.campaignId || null,
        triggerType: params.triggerType,
        status: 'RUNNING',
        currentStep: 'INITIALIZING',
        policySnapshot: (params.policySnapshot as unknown as Record<string, unknown>) || null,
        idempotencyKey: params.idempotencyKey || null,
        startedAt: new Date()
      })
      .returning();

    return this.mapRunToDomain(inserted[0], []);
  }

  async updateRun(
    runId: string,
    workspaceId: string,
    updates: Partial<{
      status: AutonomousRunStatus;
      currentStep: string;
      summary: string;
      details: Record<string, unknown>;
      error: string;
      completedAt: Date;
    }>
  ): Promise<AutonomousRun> {
    const updated = await this.db
      .update(autonomousRuns)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(eq(autonomousRuns.id, runId), eq(autonomousRuns.workspaceId, workspaceId)))
      .returning();

    if (!updated.length) {
      throw new Error(`Autonomous run "${runId}" not found in workspace "${workspaceId}".`);
    }

    const steps = await this.listRunSteps(runId, workspaceId);
    return this.mapRunToDomain(updated[0], steps);
  }

  async getRunById(runId: string, workspaceId: string): Promise<AutonomousRun | null> {
    const rows = await this.db
      .select()
      .from(autonomousRuns)
      .where(and(eq(autonomousRuns.id, runId), eq(autonomousRuns.workspaceId, workspaceId)))
      .limit(1);

    if (rows.length === 0) return null;

    const steps = await this.listRunSteps(runId, workspaceId);
    return this.mapRunToDomain(rows[0], steps);
  }

  async listRuns(
    workspaceId: string,
    filter?: { brandId?: string; status?: string; limit?: number; offset?: number }
  ): Promise<AutonomousRun[]> {
    const conditions = [eq(autonomousRuns.workspaceId, workspaceId)];
    if (filter?.brandId) {
      conditions.push(eq(autonomousRuns.brandId, filter.brandId));
    }
    if (filter?.status) {
      conditions.push(eq(autonomousRuns.status, filter.status));
    }

    const rows = await this.db
      .select()
      .from(autonomousRuns)
      .where(and(...conditions))
      .orderBy(desc(autonomousRuns.createdAt))
      .limit(filter?.limit || 20)
      .offset(filter?.offset || 0);

    return rows.map((r) => this.mapRunToDomain(r));
  }

  // ---------------------------------------------------------------------------
  // Run Steps Methods
  // ---------------------------------------------------------------------------

  async createRunStep(params: {
    runId: string;
    workspaceId: string;
    stepName: string;
    inputPayload?: Record<string, unknown>;
  }): Promise<AutonomousRunStep> {
    const inserted = await this.db
      .insert(autonomousRunSteps)
      .values({
        runId: params.runId,
        workspaceId: params.workspaceId,
        stepName: params.stepName,
        status: 'RUNNING',
        inputPayload: params.inputPayload || {},
        startedAt: new Date()
      })
      .returning();

    return this.mapRunStepToDomain(inserted[0]);
  }

  async updateRunStep(
    stepId: string,
    workspaceId: string,
    updates: Partial<{
      status: AutonomousRunStepStatus;
      outputPayload: Record<string, unknown>;
      errorMessage: string;
      completedAt: Date;
    }>
  ): Promise<AutonomousRunStep> {
    const updated = await this.db
      .update(autonomousRunSteps)
      .set(updates)
      .where(and(eq(autonomousRunSteps.id, stepId), eq(autonomousRunSteps.workspaceId, workspaceId)))
      .returning();

    if (!updated.length) {
      throw new Error(`Run step "${stepId}" not found in workspace "${workspaceId}".`);
    }

    return this.mapRunStepToDomain(updated[0]);
  }

  async listRunSteps(runId: string, workspaceId: string): Promise<AutonomousRunStep[]> {
    const rows = await this.db
      .select()
      .from(autonomousRunSteps)
      .where(and(eq(autonomousRunSteps.runId, runId), eq(autonomousRunSteps.workspaceId, workspaceId)))
      .orderBy(autonomousRunSteps.createdAt);

    return rows.map((r) => this.mapRunStepToDomain(r));
  }

  // ---------------------------------------------------------------------------
  // Execution History Methods
  // ---------------------------------------------------------------------------

  async recordExecutionHistory(params: {
    workspaceId: string;
    brandId: string;
    runId?: string | null;
    actionType: string;
    targetEntity: string;
    targetId?: string | null;
    status?: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
    reason: string;
    budgetImpact?: number;
    executionResult?: Record<string, unknown>;
    errorInformation?: string;
    idempotencyKey?: string;
    executedBy?: string;
  }): Promise<AutonomousExecutionHistoryRecord> {
    const inserted = await this.db
      .insert(autonomousExecutionHistory)
      .values({
        workspaceId: params.workspaceId,
        brandId: params.brandId,
        runId: params.runId || null,
        actionType: params.actionType,
        targetEntity: params.targetEntity,
        targetId: params.targetId || null,
        status: params.status || 'SUCCESS',
        reason: params.reason,
        budgetImpact: params.budgetImpact || 0,
        executionResult: params.executionResult || {},
        errorInformation: params.errorInformation || null,
        idempotencyKey: params.idempotencyKey || null,
        executedBy: params.executedBy || 'AUTONOMOUS_ENGINE'
      })
      .returning();

    return this.mapHistoryToDomain(inserted[0]);
  }

  async listExecutionHistory(
    workspaceId: string,
    filter?: { brandId?: string; limit?: number; offset?: number }
  ): Promise<AutonomousExecutionHistoryRecord[]> {
    const conditions = [eq(autonomousExecutionHistory.workspaceId, workspaceId)];
    if (filter?.brandId) {
      conditions.push(eq(autonomousExecutionHistory.brandId, filter.brandId));
    }

    const rows = await this.db
      .select()
      .from(autonomousExecutionHistory)
      .where(and(...conditions))
      .orderBy(desc(autonomousExecutionHistory.createdAt))
      .limit(filter?.limit || 50)
      .offset(filter?.offset || 0);

    return rows.map((r) => this.mapHistoryToDomain(r));
  }

  // ---------------------------------------------------------------------------
  // Limits & Usage Methods
  // ---------------------------------------------------------------------------

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  async getOrCreateLimits(workspaceId: string, dateStr?: string): Promise<AutonomousLimitsTracking> {
    const targetDate = dateStr || this.getTodayDateString();

    const existing = await this.db
      .select()
      .from(autonomousLimits)
      .where(
        and(eq(autonomousLimits.workspaceId, workspaceId), eq(autonomousLimits.date, targetDate))
      )
      .limit(1);

    if (existing.length > 0) {
      return this.mapLimitsToDomain(existing[0]);
    }

    const inserted = await this.db
      .insert(autonomousLimits)
      .values({
        workspaceId,
        date: targetDate,
        dailySpend: 0,
        campaignsCreated: 0,
        adsCreated: 0,
        reelsCreated: 0,
        reelsRendered: 0,
        reelsPublished: 0,
        optimizationsApplied: 0
      })
      .returning();

    return this.mapLimitsToDomain(inserted[0]);
  }

  async incrementLimits(
    workspaceId: string,
    increments: Partial<{
      dailySpend: number;
      campaignsCreated: number;
      adsCreated: number;
      reelsCreated: number;
      reelsRendered: number;
      reelsPublished: number;
      optimizationsApplied: number;
    }>,
    dateStr?: string
  ): Promise<AutonomousLimitsTracking> {
    const current = await this.getOrCreateLimits(workspaceId, dateStr);

    const updated = await this.db
      .update(autonomousLimits)
      .set({
        dailySpend: current.dailySpend + (increments.dailySpend || 0),
        campaignsCreated: current.campaignsCreated + (increments.campaignsCreated || 0),
        adsCreated: current.adsCreated + (increments.adsCreated || 0),
        reelsCreated: current.reelsCreated + (increments.reelsCreated || 0),
        reelsRendered: current.reelsRendered + (increments.reelsRendered || 0),
        reelsPublished: current.reelsPublished + (increments.reelsPublished || 0),
        optimizationsApplied: current.optimizationsApplied + (increments.optimizationsApplied || 0),
        updatedAt: new Date()
      })
      .where(eq(autonomousLimits.id, current.id))
      .returning();

    return this.mapLimitsToDomain(updated[0]);
  }

  // ---------------------------------------------------------------------------
  // Budget & Safety Events Methods
  // ---------------------------------------------------------------------------

  async recordBudgetEvent(params: {
    workspaceId: string;
    brandId: string;
    eventType: string;
    amount: number;
    limitValue: number;
    currentValue: number;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<AutonomousBudgetEvent> {
    const inserted = await this.db
      .insert(autonomousBudgetEvents)
      .values({
        workspaceId: params.workspaceId,
        brandId: params.brandId,
        eventType: params.eventType,
        amount: params.amount,
        limitValue: params.limitValue,
        currentValue: params.currentValue,
        reason: params.reason,
        metadata: params.metadata || {}
      })
      .returning();

    return this.mapBudgetEventToDomain(inserted[0]);
  }

  async listBudgetEvents(
    workspaceId: string,
    filter?: { brandId?: string; limit?: number }
  ): Promise<AutonomousBudgetEvent[]> {
    const conditions = [eq(autonomousBudgetEvents.workspaceId, workspaceId)];
    if (filter?.brandId) {
      conditions.push(eq(autonomousBudgetEvents.brandId, filter.brandId));
    }

    const rows = await this.db
      .select()
      .from(autonomousBudgetEvents)
      .where(and(...conditions))
      .orderBy(desc(autonomousBudgetEvents.createdAt))
      .limit(filter?.limit || 50);

    return rows.map((r) => this.mapBudgetEventToDomain(r));
  }

  async recordSafetyEvent(params: {
    workspaceId: string;
    brandId?: string | null;
    eventType: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    description: string;
    blockedAction?: string;
    details?: Record<string, unknown>;
  }): Promise<AutonomousSafetyEvent> {
    const inserted = await this.db
      .insert(autonomousSafetyEvents)
      .values({
        workspaceId: params.workspaceId,
        brandId: params.brandId || null,
        eventType: params.eventType,
        severity: params.severity || 'WARNING',
        description: params.description,
        blockedAction: params.blockedAction || null,
        details: params.details || {},
        resolved: 'NO'
      })
      .returning();

    return this.mapSafetyEventToDomain(inserted[0]);
  }

  async listSafetyEvents(
    workspaceId: string,
    filter?: { brandId?: string; resolved?: 'YES' | 'NO'; limit?: number }
  ): Promise<AutonomousSafetyEvent[]> {
    const conditions = [eq(autonomousSafetyEvents.workspaceId, workspaceId)];
    if (filter?.brandId) {
      conditions.push(eq(autonomousSafetyEvents.brandId, filter.brandId));
    }
    if (filter?.resolved) {
      conditions.push(eq(autonomousSafetyEvents.resolved, filter.resolved));
    }

    const rows = await this.db
      .select()
      .from(autonomousSafetyEvents)
      .where(and(...conditions))
      .orderBy(desc(autonomousSafetyEvents.createdAt))
      .limit(filter?.limit || 50);

    return rows.map((r) => this.mapSafetyEventToDomain(r));
  }

  async resolveSafetyEvent(eventId: string, workspaceId: string): Promise<AutonomousSafetyEvent> {
    const updated = await this.db
      .update(autonomousSafetyEvents)
      .set({ resolved: 'YES' })
      .where(
        and(eq(autonomousSafetyEvents.id, eventId), eq(autonomousSafetyEvents.workspaceId, workspaceId))
      )
      .returning();

    if (!updated.length) {
      throw new Error(`Safety event "${eventId}" not found in workspace "${workspaceId}".`);
    }

    return this.mapSafetyEventToDomain(updated[0]);
  }
}
