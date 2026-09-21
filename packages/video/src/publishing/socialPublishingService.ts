import type { Database } from '@vidsnapai/database';
import type {
  SocialPublicationRecord,
  PublishingPlatform,
  PublishResult
} from '@vidsnapai/types';
import { SocialPublicationRepository } from './socialPublicationRepository.js';
import { SocialPublisherFactory } from './socialPublisherFactory.js';
import { ReelProductionPlanRepository } from '../repositories/reel-production-plan.repository.js';

export class SocialPublishingService {
  private pubRepo: SocialPublicationRepository;
  private reelRepo: ReelProductionPlanRepository;

  constructor(
    private db: Database,
    options?: {
      pubRepo?: SocialPublicationRepository;
      reelRepo?: ReelProductionPlanRepository;
    }
  ) {
    this.pubRepo = options?.pubRepo || new SocialPublicationRepository(db);
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
  }

  /**
   * Schedule a reel for publication.
   */
  async schedulePublication(params: {
    reelPlanId: string;
    workspaceId: string;
    brandId: string;
    platform: PublishingPlatform;
    scheduledAt: Date;
    caption?: string;
    hashtags?: string[];
  }): Promise<SocialPublicationRecord> {
    const { reelPlanId, workspaceId, brandId, platform, scheduledAt, caption, hashtags } = params;

    const reel = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reel) {
      throw new Error(`Reel "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    if (!reel.outputVideoUrl && (!reel.renderOutput || !reel.renderOutput.outputVideoUrl)) {
      throw new Error(`Cannot schedule reel "${reelPlanId}": Video rendering is not completed.`);
    }

    // Determine final caption & hashtags from reel metadata or parameters
    const finalCaption = caption || (reel.concept as any)?.caption || reel.title || '';
    const finalHashtags = hashtags || (reel.concept as any)?.hashtags || ['#vidsnapai', '#reels'];

    const publication = await this.pubRepo.create({
      reelPlanId,
      workspaceId,
      brandId,
      platform,
      status: 'SCHEDULED',
      scheduledAt,
      payload: {
        caption: finalCaption,
        hashtags: finalHashtags,
        mediaUrl: reel.outputVideoUrl || reel.renderOutput?.outputVideoUrl,
        title: reel.title
      }
    });

    await this.reelRepo.updateStatus(reelPlanId, 'SCHEDULED');
    return publication;
  }

  /**
   * Publish a reel immediately or execute a queued publishing job.
   */
  async publishReel(params: {
    publicationId?: string;
    reelPlanId: string;
    workspaceId: string;
    brandId: string;
    platform: PublishingPlatform;
    caption?: string;
    hashtags?: string[];
  }): Promise<{ publication: SocialPublicationRecord; result: PublishResult }> {
    const { reelPlanId, workspaceId, brandId, platform } = params;

    const reel = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reel) {
      throw new Error(`Reel "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    const videoUrl = reel.outputVideoUrl || reel.renderOutput?.outputVideoUrl;
    if (!videoUrl) {
      throw new Error(`Cannot publish reel "${reelPlanId}": Video is not rendered.`);
    }

    // Idempotency: Check existing publications
    let publication: SocialPublicationRecord | null = null;
    if (params.publicationId) {
      publication = await this.pubRepo.findById(params.publicationId, workspaceId);
    }

    if (!publication) {
      publication = await this.pubRepo.create({
        reelPlanId,
        workspaceId,
        brandId,
        platform,
        status: 'PUBLISHING',
        payload: {
          caption: params.caption || reel.title,
          hashtags: params.hashtags || ['#vidsnapai'],
          mediaUrl: videoUrl,
          title: reel.title
        }
      });
    } else {
      if (publication.status === 'PUBLISHED') {
        return {
          publication,
          result: {
            success: true,
            platform,
            externalPostId: publication.externalPostId,
            externalUrl: publication.externalUrl,
            publishedAt: publication.publishedAt || new Date().toISOString()
          }
        };
      }
      publication = (await this.pubRepo.updateStatus(publication.id, workspaceId, {
        status: 'PUBLISHING',
        incrementAttempt: true
      }))!;
    }

    const publisher = SocialPublisherFactory.getPublisher(platform);

    try {
      const result = await publisher.publishReel({
        reelPlanId,
        workspaceId,
        brandId,
        platform,
        videoUrl,
        caption: (publication.payload as any)?.caption || params.caption || reel.title,
        hashtags: (publication.payload as any)?.hashtags || params.hashtags || ['#vidsnapai'],
        title: reel.title
      });

      if (result.success) {
        const updated = await this.pubRepo.updateStatus(publication.id, workspaceId, {
          status: 'PUBLISHED',
          publishedAt: new Date(result.publishedAt),
          externalPostId: result.externalPostId,
          externalUrl: result.externalUrl
        });
        await this.reelRepo.updateStatus(reelPlanId, 'PUBLISHED');
        return { publication: updated!, result };
      } else {
        const failed = await this.pubRepo.updateStatus(publication.id, workspaceId, {
          status: 'FAILED',
          errorCode: result.errorCode || 'PUBLISH_FAILED',
          errorMessage: result.errorMessage || 'Publishing failed'
        });
        await this.reelRepo.updateStatus(reelPlanId, 'PUBLISH_FAILED');
        return { publication: failed!, result };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown publishing error';
      await this.pubRepo.updateStatus(publication.id, workspaceId, {
        status: 'FAILED',
        errorCode: 'PUBLISHER_EXCEPTION',
        errorMessage: errorMsg
      });
      await this.reelRepo.updateStatus(reelPlanId, 'PUBLISH_FAILED');
      throw err;
    }
  }

  async getPublications(reelPlanId: string, workspaceId: string): Promise<SocialPublicationRecord[]> {
    return this.pubRepo.listByReelPlanId(reelPlanId, workspaceId);
  }
}
