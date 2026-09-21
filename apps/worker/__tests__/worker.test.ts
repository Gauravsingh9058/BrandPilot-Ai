import { describe, it, expect } from 'vitest';
import { processTestJob } from '../src/processors/test-job.processor.js';
import type { Job } from 'bullmq';
import type { TestJobPayload } from '@vidsnapai/types';

describe('Worker Queue Processor Tests', () => {
  it('processes a test job and generates structured result output', async () => {
    const mockJob: Partial<Job<TestJobPayload>> = {
      id: 'job-999',
      data: {
        id: 'payload-123',
        message: 'Execute video pipeline precheck',
        timestamp: Date.now(),
        triggeredBy: 'tester@vidsnapai.com'
      }
    };

    const result = await processTestJob(mockJob as Job<TestJobPayload>);

    expect(result.jobId).toBe('job-999');
    expect(result.status).toBe('completed');
    expect(result.output).toContain('Execute video pipeline precheck');
    expect(result.processedAt).toBeDefined();
  });
});
