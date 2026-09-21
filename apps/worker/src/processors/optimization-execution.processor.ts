import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { OptimizationExecutionService } from '@vidsnapai/video';
import type {
  OptimizationExecutionJobPayload,
  OptimizationExecutionJobResult
} from '@vidsnapai/types';

export async function processOptimizationExecutionJob(
  job: Job<OptimizationExecutionJobPayload>
): Promise<OptimizationExecutionJobResult> {
  const { id, workspaceId, actionId, executedBy } = job.data;
  console.log(`[Worker] Starting Optimization Execution job #${job.id}: Action=${actionId} Workspace=${workspaceId}`);

  await job.updateProgress(10);

  const db = getDatabase();
  const executionService = new OptimizationExecutionService(db);

  try {
    await job.updateProgress(30);

    await executionService.applyAction(actionId, workspaceId, {
      executedBy: executedBy || 'WORKER'
    });

    await job.updateProgress(100);
    console.log(
      `[Worker] Finished Optimization Execution job #${job.id} -> Success for Action=${actionId}`
    );

    return {
      jobId: id || String(job.id),
      workspaceId,
      actionId,
      status: 'completed',
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown optimization execution failure';
    console.error(`[Worker] Optimization Execution job #${job.id} failed:`, errorMsg);

    return {
      jobId: id || String(job.id),
      workspaceId,
      actionId,
      status: 'failed',
      error: errorMsg,
      processedAt: new Date().toISOString()
    };
  }
}
