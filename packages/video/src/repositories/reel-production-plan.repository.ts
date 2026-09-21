import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import {
  reelProductionPlans,
  type ReelProductionPlanRow,
  type NewReelProductionPlanRow
} from '@vidsnapai/database';
import type {
  ReelProductionPlan,
  ReelStatus,
  ReelConcept,
  Hook,
  ScriptSegment,
  ReelScene,
  VisualDirection,
  VoiceDirection,
  CaptionDirection,
  AnimationDirection,
  AudioDirection,
  ReelCTA,
  ProductionMetadata,
  UpdateReelPlanInput,
  VideoRenderOutput
} from '@vidsnapai/types';

export function mapReelProductionPlanRow(row: ReelProductionPlanRow): ReelProductionPlan {
  const productionMetadata = (row.productionMetadata as ProductionMetadata) || {};
  const renderOutput = productionMetadata.renderOutput;
  const outputVideoUrl = renderOutput?.outputVideoUrl;
  const targetProductId = (productionMetadata as any).targetProductId || (row as any).targetProductId || (row.concept as any)?.targetProductId || undefined;

  return {
    id: row.id,
    contentJobId: row.contentJobId,
    brandId: row.brandId,
    campaignId: row.campaignId,
    contentPlanId: row.contentPlanId,
    workspaceId: row.workspaceId,
    version: row.version,
    targetProductId,
    productId: targetProductId,
    title: row.title,
    concept: (row.concept as ReelConcept) || {},
    objective: row.objective,
    audience: row.audience,
    funnelStage: row.funnelStage,
    contentPillar: row.contentPillar,
    durationSeconds: row.durationSeconds,
    aspectRatio: row.aspectRatio,
    platform: row.platform,
    format: row.format,
    hook: (row.hook as Hook) || {},
    narrative: row.narrative,
    script: (row.script as ScriptSegment[]) || [],
    scenes: (row.scenes as ReelScene[]) || [],
    visualDirection: (row.visualDirection as VisualDirection) || {},
    voiceDirection: (row.voiceDirection as VoiceDirection) || {},
    captionDirection: (row.captionDirection as CaptionDirection) || {},
    animationDirection: (row.animationDirection as AnimationDirection) || {},
    audioDirection: (row.audioDirection as AudioDirection) || {},
    cta: (row.cta as ReelCTA) || {},
    productionMetadata,
    status: row.status as ReelStatus,
    renderOutput,
    outputVideoUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export class ReelProductionPlanRepository {
  constructor(private db: Database) {}

  async create(data: {
    contentJobId: string;
    brandId: string;
    campaignId?: string | null;
    contentPlanId: string;
    workspaceId: string;
    version?: number;
    title: string;
    concept: ReelConcept;
    objective: string;
    audience: string;
    funnelStage: string;
    contentPillar: string;
    durationSeconds: number;
    aspectRatio?: string;
    platform?: string;
    format?: string;
    hook: Hook;
    narrative: string;
    script: ScriptSegment[];
    scenes: ReelScene[];
    visualDirection: VisualDirection;
    voiceDirection: VoiceDirection;
    captionDirection: CaptionDirection;
    animationDirection: AnimationDirection;
    audioDirection: AudioDirection;
    cta: ReelCTA;
    productionMetadata: ProductionMetadata;
    status?: ReelStatus;
  }): Promise<ReelProductionPlan> {
    const version = data.version ?? (await this.getNextVersionNumber(data.contentJobId));

    const values: NewReelProductionPlanRow = {
      contentJobId: data.contentJobId,
      brandId: data.brandId,
      campaignId: data.campaignId || null,
      contentPlanId: data.contentPlanId,
      workspaceId: data.workspaceId,
      version,
      title: data.title,
      concept: data.concept,
      objective: data.objective,
      audience: data.audience,
      funnelStage: data.funnelStage,
      contentPillar: data.contentPillar,
      durationSeconds: data.durationSeconds,
      aspectRatio: data.aspectRatio || '9:16',
      platform: data.platform || 'INSTAGRAM',
      format: data.format || 'REEL',
      hook: data.hook,
      narrative: data.narrative,
      script: data.script,
      scenes: data.scenes,
      visualDirection: data.visualDirection,
      voiceDirection: data.voiceDirection,
      captionDirection: data.captionDirection,
      animationDirection: data.animationDirection,
      audioDirection: data.audioDirection,
      cta: data.cta,
      productionMetadata: data.productionMetadata,
      status: data.status || 'READY'
    };

    const [row] = await this.db.insert(reelProductionPlans).values(values).returning();
    return mapReelProductionPlanRow(row);
  }

  async getNextVersionNumber(contentJobId: string): Promise<number> {
    const [latest] = await this.db
      .select({ version: reelProductionPlans.version })
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.contentJobId, contentJobId))
      .orderBy(desc(reelProductionPlans.version))
      .limit(1);

    return (latest?.version ?? 0) + 1;
  }

  async findById(id: string): Promise<ReelProductionPlan | null> {
    const [row] = await this.db
      .select()
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.id, id))
      .limit(1);

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<ReelProductionPlan | null> {
    const [row] = await this.db
      .select()
      .from(reelProductionPlans)
      .where(
        and(
          eq(reelProductionPlans.id, id),
          eq(reelProductionPlans.workspaceId, workspaceId)
        )
      )
      .limit(1);

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async findLatestByContentJobId(contentJobId: string): Promise<ReelProductionPlan | null> {
    const [row] = await this.db
      .select()
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.contentJobId, contentJobId))
      .orderBy(desc(reelProductionPlans.version))
      .limit(1);

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async findByContentJobIdAndVersion(
    contentJobId: string,
    version: number
  ): Promise<ReelProductionPlan | null> {
    const [row] = await this.db
      .select()
      .from(reelProductionPlans)
      .where(
        and(
          eq(reelProductionPlans.contentJobId, contentJobId),
          eq(reelProductionPlans.version, version)
        )
      )
      .limit(1);

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async listByContentJobId(contentJobId: string): Promise<ReelProductionPlan[]> {
    const rows = await this.db
      .select()
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.contentJobId, contentJobId))
      .orderBy(desc(reelProductionPlans.version));

    return rows.map(mapReelProductionPlanRow);
  }

  async listByContentPlanId(contentPlanId: string): Promise<ReelProductionPlan[]> {
    const rows = await this.db
      .select()
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.contentPlanId, contentPlanId))
      .orderBy(desc(reelProductionPlans.createdAt));

    return rows.map(mapReelProductionPlanRow);
  }

  async listByBrandId(brandId: string): Promise<ReelProductionPlan[]> {
    const rows = await this.db
      .select()
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.brandId, brandId))
      .orderBy(desc(reelProductionPlans.createdAt));

    return rows.map(mapReelProductionPlanRow);
  }

  async listByWorkspace(workspaceId: string): Promise<ReelProductionPlan[]> {
    const rows = await this.db
      .select()
      .from(reelProductionPlans)
      .where(eq(reelProductionPlans.workspaceId, workspaceId))
      .orderBy(desc(reelProductionPlans.createdAt));

    return rows.map(mapReelProductionPlanRow);
  }

  async update(id: string, input: UpdateReelPlanInput): Promise<ReelProductionPlan | null> {
    const updateValues: Partial<NewReelProductionPlanRow> = {
      updatedAt: new Date()
    };

    if (input.title !== undefined) updateValues.title = input.title;
    if (input.concept !== undefined) updateValues.concept = input.concept as ReelConcept;
    if (input.objective !== undefined) updateValues.objective = input.objective;
    if (input.audience !== undefined) updateValues.audience = input.audience;
    if (input.funnelStage !== undefined) updateValues.funnelStage = input.funnelStage;
    if (input.contentPillar !== undefined) updateValues.contentPillar = input.contentPillar;
    if (input.durationSeconds !== undefined) updateValues.durationSeconds = input.durationSeconds;
    if (input.aspectRatio !== undefined) updateValues.aspectRatio = input.aspectRatio;
    if (input.platform !== undefined) updateValues.platform = input.platform;
    if (input.format !== undefined) updateValues.format = input.format;
    if (input.hook !== undefined) updateValues.hook = input.hook as Hook;
    if (input.narrative !== undefined) updateValues.narrative = input.narrative;
    if (input.script !== undefined) updateValues.script = input.script;
    if (input.scenes !== undefined) updateValues.scenes = input.scenes;
    if (input.visualDirection !== undefined) updateValues.visualDirection = input.visualDirection as VisualDirection;
    if (input.voiceDirection !== undefined) updateValues.voiceDirection = input.voiceDirection as VoiceDirection;
    if (input.captionDirection !== undefined) updateValues.captionDirection = input.captionDirection as CaptionDirection;
    if (input.animationDirection !== undefined) updateValues.animationDirection = input.animationDirection as AnimationDirection;
    if (input.audioDirection !== undefined) updateValues.audioDirection = input.audioDirection as AudioDirection;
    if (input.cta !== undefined) updateValues.cta = input.cta as ReelCTA;
    if (input.productionMetadata !== undefined) updateValues.productionMetadata = input.productionMetadata as ProductionMetadata;
    if (input.status !== undefined) updateValues.status = input.status;

    const [row] = await this.db
      .update(reelProductionPlans)
      .set(updateValues)
      .where(eq(reelProductionPlans.id, id))
      .returning();

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async updateStatus(id: string, status: ReelStatus): Promise<ReelProductionPlan | null> {
    const [row] = await this.db
      .update(reelProductionPlans)
      .set({ status, updatedAt: new Date() })
      .where(eq(reelProductionPlans.id, id))
      .returning();

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async saveRenderOutput(
    id: string,
    renderOutput: VideoRenderOutput,
    status: ReelStatus = 'COMPLETED'
  ): Promise<ReelProductionPlan | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updatedMetadata: ProductionMetadata = {
      ...existing.productionMetadata,
      renderOutput
    };

    const [row] = await this.db
      .update(reelProductionPlans)
      .set({
        status,
        productionMetadata: updatedMetadata,
        updatedAt: new Date()
      })
      .where(eq(reelProductionPlans.id, id))
      .returning();

    return row ? mapReelProductionPlanRow(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(reelProductionPlans)
      .where(eq(reelProductionPlans.id, id))
      .returning({ id: reelProductionPlans.id });

    return result.length > 0;
  }
}
