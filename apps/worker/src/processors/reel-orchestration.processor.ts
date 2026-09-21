import type { Job } from 'bullmq';
import type { ReelOrchestrationJobPayload, ReelOrchestrationJobResult } from '@vidsnapai/types';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import { ReelPlannerService } from '@vidsnapai/video';

export async function processReelOrchestrationJob(
  job: Job<ReelOrchestrationJobPayload>
): Promise<ReelOrchestrationJobResult> {
  const payload = job.data;
  const startTime = Date.now();

  console.log(
    `[Reel Worker] Processing job #${job.id}: Action="${payload.action}", ContentJob="${payload.contentJobId}", Brand="${payload.brandId}"`
  );

  const config = getConfig();
  const db = getDatabase();
  const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });
  const plannerService = new ReelPlannerService(db, aiProvider);

  try {
    let resultPlan;

    if (payload.action === 'REGENERATE_REEL_PLAN') {
      resultPlan = await plannerService.regenerateReelForJob(
        payload.contentJobId,
        payload.workspaceId,
        payload.input
      );
    } else {
      resultPlan = await plannerService.generateReelForJob(
        payload.contentJobId,
        payload.workspaceId,
        payload.input
      );
    }

    const durationMs = Date.now() - startTime;
    console.log(
      `[Reel Worker] Successfully finished job #${job.id} for ReelPlan "${resultPlan.id}" (v${resultPlan.version}) in ${durationMs}ms`
    );

    return {
      jobId: String(job.id),
      contentJobId: payload.contentJobId,
      reelPlanId: resultPlan.id,
      version: resultPlan.version,
      status: 'completed',
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Reel Worker] Error processing job #${job.id}:`, errorMsg);
    throw err;
  }
}
