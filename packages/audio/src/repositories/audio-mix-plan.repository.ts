import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '@vidsnapai/database';
import { audioMixPlans, type AudioMixPlanRow } from '@vidsnapai/database';
import type { AudioMixPlan, VoiceConfiguration, MusicSelection, SFXSelection, AudioMixSettings } from '@vidsnapai/types';

export class AudioMixPlanRepository {
  constructor(private db: Database) {}

  private mapRowToEntity(row: AudioMixPlanRow): AudioMixPlan {
    return {
      id: row.id,
      reelPlanId: row.reelPlanId,
      workspaceId: row.workspaceId,
      brandId: row.brandId,
      voiceConfig: (row.voiceConfig as VoiceConfiguration) || {},
      musicConfig: (row.musicConfig as MusicSelection) || { source: 'AI_RECOMMENDED', volume: 0.3 },
      sfxConfigs: (row.sfxConfigs as SFXSelection[]) || [],
      mixSettings: (row.mixSettings as AudioMixSettings) || {
        voiceVolume: 1.0,
        musicVolume: 0.3,
        sfxVolume: 0.4,
        ducking: true,
        duckingLevel: 0.2,
        fadeInSeconds: 0.5,
        fadeOutSeconds: 1.0,
        priorityOrder: ['VOICE', 'SFX', 'MUSIC']
      },
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  async createOrUpdate(data: Omit<AudioMixPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<AudioMixPlan> {
    const existing = await this.findByReelPlanId(data.reelPlanId);

    if (existing) {
      const [row] = await this.db
        .update(audioMixPlans)
        .set({
          voiceConfig: data.voiceConfig,
          musicConfig: data.musicConfig,
          sfxConfigs: data.sfxConfigs,
          mixSettings: data.mixSettings,
          status: data.status,
          updatedAt: new Date()
        })
        .where(eq(audioMixPlans.id, existing.id))
        .returning();

      return this.mapRowToEntity(row);
    }

    const [row] = await this.db
      .insert(audioMixPlans)
      .values({
        reelPlanId: data.reelPlanId,
        workspaceId: data.workspaceId,
        brandId: data.brandId,
        voiceConfig: data.voiceConfig,
        musicConfig: data.musicConfig,
        sfxConfigs: data.sfxConfigs,
        mixSettings: data.mixSettings,
        status: data.status || 'READY'
      })
      .returning();

    return this.mapRowToEntity(row);
  }

  async findByReelPlanId(reelPlanId: string): Promise<AudioMixPlan | null> {
    const [row] = await this.db
      .select()
      .from(audioMixPlans)
      .where(eq(audioMixPlans.reelPlanId, reelPlanId))
      .orderBy(desc(audioMixPlans.createdAt))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<AudioMixPlan | null> {
    const [row] = await this.db
      .select()
      .from(audioMixPlans)
      .where(and(eq(audioMixPlans.id, id), eq(audioMixPlans.workspaceId, workspaceId)))
      .limit(1);

    return row ? this.mapRowToEntity(row) : null;
  }

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const [row] = await this.db
      .delete(audioMixPlans)
      .where(and(eq(audioMixPlans.id, id), eq(audioMixPlans.workspaceId, workspaceId)))
      .returning({ id: audioMixPlans.id });

    return !row;
  }
}
