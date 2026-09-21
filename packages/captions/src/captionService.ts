import type { Database } from '@vidsnapai/database';
import type {
  ReelProductionPlan,
  CaptionTrack,
  CaptionCue,
  CaptionStyleConfig
} from '@vidsnapai/types';
import { CaptionTrackRepository } from './repositories/caption-track.repository.js';
import { CaptionGenerator } from './captionGenerator.js';

export interface GenerateCaptionsOptions {
  style?: CaptionStyleConfig;
  customCues?: CaptionCue[];
}

export class CaptionService {
  private captionRepo: CaptionTrackRepository;

  constructor(
    db: Database,
    options?: {
      captionRepo?: CaptionTrackRepository;
    }
  ) {
    this.captionRepo = options?.captionRepo || new CaptionTrackRepository(db);
  }

  /**
   * Generates or regenerates timed caption cues for a Reel plan.
   */
  async generateCaptionTrack(
    reelPlan: ReelProductionPlan,
    workspaceId: string,
    options: GenerateCaptionsOptions = {}
  ): Promise<CaptionTrack> {
    const captionDirection = reelPlan.captionDirection || {};
    const defaultStyle: CaptionStyleConfig = {
      fontFamily: 'Outfit',
      fontSize: 32,
      primaryColor: '#FFFFFF',
      highlightColor: '#6366F1',
      animationStyle: 'kinetic',
      position: (captionDirection.placement?.includes('top') ? 'top' : captionDirection.placement?.includes('center') ? 'center' : 'bottom') as any,
      maxWordsPerLine: 4,
      ...options.style
    };

    const cues = options.customCues || CaptionGenerator.generateCues(reelPlan, defaultStyle);
    const nextVersion = await this.captionRepo.getNextVersionNumber(reelPlan.id);

    return this.captionRepo.create({
      reelPlanId: reelPlan.id,
      workspaceId,
      brandId: reelPlan.brandId,
      version: nextVersion,
      cues,
      style: defaultStyle,
      status: 'READY'
    });
  }

  /**
   * Retrieves the latest caption track for a Reel plan.
   */
  async getCaptionTrack(reelPlanId: string): Promise<CaptionTrack | null> {
    return this.captionRepo.findLatestByReelPlanId(reelPlanId);
  }

  /**
   * Retrieves a specific caption track by its primary key ID.
   */
  async getCaptionTrackById(trackId: string): Promise<CaptionTrack | null> {
    return this.captionRepo.findById(trackId);
  }

  /**
   * Updates caption cues or styling in place.
   */
  async updateCaptionTrack(
    reelPlanId: string,
    workspaceId: string,
    updates: { cues?: CaptionCue[]; style?: CaptionStyleConfig }
  ): Promise<CaptionTrack> {
    const current = await this.captionRepo.findLatestByReelPlanId(reelPlanId);
    if (!current) {
      throw new Error(`Caption track not found for Reel plan ${reelPlanId}`);
    }

    const updated = await this.captionRepo.update(current.id, workspaceId, {
      cues: updates.cues || current.cues,
      style: updates.style ? { ...current.style, ...updates.style } : current.style
    });

    if (!updated) {
      throw new Error(`Failed to update caption track ${current.id}`);
    }

    return updated;
  }
}
