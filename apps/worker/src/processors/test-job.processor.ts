import type { Job } from 'bullmq';
import type { TestJobPayload, TestJobResult } from '@vidsnapai/types';

export async function processTestJob(job: Job<TestJobPayload>): Promise<TestJobResult> {
  const startTime = Date.now();
  const payload = job.data;

  console.log(`[Worker] Starting job #${job.id}: "${payload.message}" (Payload ID: ${payload.id})`);

  // Simulate short async processing
  await new Promise((resolve) => setTimeout(resolve, 50));

  const durationMs = Date.now() - startTime;
  const result: TestJobResult = {
    jobId: String(job.id),
    processedAt: new Date().toISOString(),
    status: 'completed',
    output: `Successfully processed message: "${payload.message}" in ${durationMs}ms`
  };

  console.log(`[Worker] Finished job #${job.id} with status: ${result.status}`);
  return result;
}
