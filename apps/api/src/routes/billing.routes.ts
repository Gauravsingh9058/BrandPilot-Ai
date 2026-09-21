import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  CreateCheckoutSessionSchema,
  CreatePortalSessionSchema,
  BillingWebhookPayloadSchema
} from '@vidsnapai/validation';
import { BillingService } from '../services/billing.service.js';
import { requireAuth } from '../middleware/auth.js';
import { getVerifiedWorkspaceId } from '../middleware/workspace.js';
import type { ApiResponse, SubscriptionTier } from '@vidsnapai/types';

export const billingRouter: Router = Router();
const billingService = new BillingService();

// ----------------------------------------------------
// GET /api/billing/plans - List all available pricing plans
// ----------------------------------------------------
billingRouter.get('/plans', (req: Request, res: Response) => {
  const plans = billingService.getPlans();
  const response: ApiResponse = {
    success: true,
    data: { plans },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString()
    }
  };
  res.status(200).json(response);
});

// ----------------------------------------------------
// POST /api/billing/webhook - Ingest Stripe billing webhooks
// ----------------------------------------------------
billingRouter.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = BillingWebhookPayloadSchema.parse(req.body);
    const result = await billingService.handleWebhookEvent(payload);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// All subsequent routes require user authentication
billingRouter.use(requireAuth);

// ----------------------------------------------------
// GET /api/billing/subscription - Get workspace subscription, tier limits, and usage
// ----------------------------------------------------
billingRouter.get('/subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await getVerifiedWorkspaceId(req);
    const details = await billingService.getWorkspaceBillingDetails(workspaceId);

    const response: ApiResponse = {
      success: true,
      data: details,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// POST /api/billing/checkout - Create a checkout session for tier upgrade
// ----------------------------------------------------
billingRouter.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
    const input = CreateCheckoutSessionSchema.parse(req.body);
    const session = await billingService.createCheckoutSession(workspaceId, input, req.user?.email);

    // In local / test simulation mode, persist the upgrade in DB
    if (session.mode === 'simulated') {
      await billingService.upgradeTier(workspaceId, input.tier);
    }

    const response: ApiResponse = {
      success: true,
      data: session,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// POST /api/billing/test-upgrade - Direct DB tier upgrade for development/testing
// ----------------------------------------------------
billingRouter.post('/test-upgrade', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
    const tier = (req.body?.tier as SubscriptionTier) || 'PRO';

    const subscription = await billingService.upgradeTier(workspaceId, tier);

    const response: ApiResponse = {
      success: true,
      data: {
        subscription,
        message: `Workspace upgraded to ${tier} (Test/Local Mode)`
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// POST /api/billing/portal - Create customer billing portal session
// ----------------------------------------------------
billingRouter.post('/portal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await getVerifiedWorkspaceId(req, ['OWNER', 'ADMIN']);
    const input = CreatePortalSessionSchema.parse(req.body);
    const session = await billingService.createCustomerPortalSession(workspaceId, input);

    const response: ApiResponse = {
      success: true,
      data: session,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------
// GET /api/billing/usage - Get workspace usage metrics
// ----------------------------------------------------
billingRouter.get('/usage', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await getVerifiedWorkspaceId(req);
    const details = await billingService.getWorkspaceBillingDetails(workspaceId);

    const response: ApiResponse = {
      success: true,
      data: {
        usage: details.usage,
        limits: details.limits,
        tier: details.subscription.tier
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});
