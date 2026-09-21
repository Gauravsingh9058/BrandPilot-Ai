import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { QueueService } from '../services/queue.service.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, TestJobPayload } from '@vidsnapai/types';

export const queueRouter: Router = Router();
const queueService = new QueueService();

// POST /api/queue/test-job
queueRouter.post('/test-job', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload: TestJobPayload = {
      id: randomUUID(),
      message: req.body.message || 'VidSnapAI Phase 1 Queue Verification Task',
      timestamp: Date.now(),
      triggeredBy: req.user?.email
    };

    const result = await queueService.enqueueTestJob(payload);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Test job enqueued successfully',
        jobId: result.jobId,
        payload
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
});
