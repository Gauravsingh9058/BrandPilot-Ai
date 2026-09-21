import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import { AutonomousOperationsService } from '@vidsnapai/video';
import type {
  AutonomousJobPayload,
  AutonomousJobResult
} from '@vidsnapai/types';

export async function processAutonomousCampaignJob(
  job: Job<AutonomousJobPayload>
): Promise<AutonomousJobResult> {
  const { id, workspaceId, brandId, campaignId, triggerType = 'SCHEDULED', options } = job.data;
  console.log(`[Worker] Starting Autonomous Campaign job #${job.id}: Brand=${brandId} Workspace=${workspaceId}`);

  await job.updateProgress(10);

  const db = getDatabase();
  const config = getConfig();
  const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });
  const operationsService = new AutonomousOperationsService(db, aiProvider);

  try {
    await job.updateProgress(30);

    const run = await operationsService.executeAutonomousRun(workspaceId, {
      brandId,
      campaignId,
      triggerType,
      forceAutonomousMode: options?.forceAutonomousMode,
      skipPublish: options?.skipPublish,
      daysToPlan: options?.daysToPlan || 7,
      idempotencyKey: `auton_worker_${workspaceId}_${job.id}_${Date.now()}`
    });

    await job.updateProgress(100);
    console.log(
      `[Worker] Finished Autonomous Campaign job #${job.id} -> Status=${run.status} RunId=${run.id}`
    );

    return {
      jobId: id || String(job.id),
      workspaceId,
      brandId,
      runId: run.id,
      status: run.status,
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown autonomous operations failure';
    console.error(`[Worker] Autonomous Campaign job #${job.id} failed:`, errorMsg);

    throw err instanceof Error ? err : new Error(errorMsg);
  }
}
