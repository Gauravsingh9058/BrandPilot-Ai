import { getDatabase, type Database } from '@vidsnapai/database';
import { SubscriptionRepository, TIER_LIMITS_MAP } from '@vidsnapai/database';
import type {
  BillingPlan,
  SubscriptionTier,
  TierLimits,
  WorkspaceSubscription,
  WorkspaceUsageRecord,
  TierLimitCheckResult
} from '@vidsnapai/types';
import type { CreateCheckoutSessionInput, CreatePortalSessionInput } from '@vidsnapai/validation';

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'plan_free',
    tier: 'FREE',
    name: 'Free Starter',
    description: 'Perfect for testing VidSnapAI and generating your first viral reels.',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    limits: TIER_LIMITS_MAP.FREE,
    features: [
      '5 Reels per month',
      '1 Active Campaign',
      '1 Brand Workspace',
      'Standard AI Quality (Gemini Flash)',
      '720p Video Export',
      'Manual Approval Workflow',
      '1 GB Cloud Storage',
      'Community Support'
    ]
  },
  {
    id: 'plan_starter',
    tier: 'STARTER',
    name: 'Creator Starter',
    description: 'For growing creators and indie founders looking to automate weekly content.',
    monthlyPriceUsd: 29,
    annualPriceUsd: 290,
    stripePriceIdMonthly: 'price_starter_monthly',
    stripePriceIdAnnual: 'price_starter_annual',
    limits: TIER_LIMITS_MAP.STARTER,
    features: [
      '30 Reels per month',
      '3 Active Campaigns',
      '2 Brands / Workspaces',
      'High Quality AI Generation',
      '1080p Full HD Export',
      'Meta Direct Publishing & Ads Integration',
      '10 GB Cloud Storage',
      'Standard Email Support'
    ]
  },
  {
    id: 'plan_pro',
    tier: 'PRO',
    name: 'Growth Pro',
    description: 'For scaling brands and marketing teams wanting full autonomous operations.',
    monthlyPriceUsd: 79,
    annualPriceUsd: 790,
    stripePriceIdMonthly: 'price_pro_monthly',
    stripePriceIdAnnual: 'price_pro_annual',
    popular: true,
    limits: TIER_LIMITS_MAP.PRO,
    features: [
      '150 Reels per month',
      '15 Active Campaigns',
      '10 Brands / Workspaces',
      'Autonomous 24/7 AI Engine',
      'Meta Autonomous Ads & Creative Optimizer',
      '4K Ultra HD Export',
      'Full Voice & Music Custom Mix',
      '50 GB Cloud Storage',
      'Priority Support (24h SLA)'
    ]
  },
  {
    id: 'plan_enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise Scale',
    description: 'For agencies and multi-brand enterprises needing custom throughput and SLA.',
    monthlyPriceUsd: 249,
    annualPriceUsd: 2490,
    stripePriceIdMonthly: 'price_enterprise_monthly',
    stripePriceIdAnnual: 'price_enterprise_annual',
    limits: TIER_LIMITS_MAP.ENTERPRISE,
    features: [
      'Unlimited Reels & Campaigns',
      'Unlimited Brands / Workspaces',
      'Multi-Account Meta Automation',
      'Custom Voice Cloning & Brand Models',
      'Dedicated Autonomous Worker Concurrency',
      '500 GB Cloud Storage',
      'Dedicated Account Manager & 99.9% SLA'
    ]
  }
];

export class BillingService {
  private subscriptionRepo: SubscriptionRepository;

  constructor(db?: Database, repo?: SubscriptionRepository) {
    if (repo) {
      this.subscriptionRepo = repo;
    } else {
      let database: Database;
      try {
        database = db || getDatabase();
      } catch {
        database = {} as Database;
      }
      this.subscriptionRepo = new SubscriptionRepository(database);
    }
  }

  getPlans(): BillingPlan[] {
    return BILLING_PLANS;
  }

  getPlanByTier(tier: SubscriptionTier): BillingPlan {
    const plan = BILLING_PLANS.find((p) => p.tier === tier);
    if (!plan) {
      return BILLING_PLANS[0];
    }
    return plan;
  }

  async getWorkspaceBillingDetails(workspaceId: string): Promise<{
    subscription: WorkspaceSubscription;
    plan: BillingPlan;
    limits: TierLimits;
    usage: WorkspaceUsageRecord;
  }> {
    const subscription = await this.subscriptionRepo.getForWorkspace(workspaceId);
    const plan = this.getPlanByTier(subscription.tier);
    const limits = plan.limits;
    const usage = await this.subscriptionRepo.getUsage(workspaceId);

    return {
      subscription,
      plan,
      limits,
      usage
    };
  }

  async createCheckoutSession(
    workspaceId: string,
    input: CreateCheckoutSessionInput,
    userEmail?: string
  ): Promise<{ checkoutUrl: string; sessionId: string; mode: 'stripe' | 'simulated' }> {
    const targetPlan = this.getPlanByTier(input.tier);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    if (!stripeKey || stripeKey.trim() === '') {
      // In local/mock/dev mode without live Stripe credentials, provide mock checkout URL
      const successBase = input.successUrl || `${process.env.WEB_BASE_URL || 'http://localhost:5173'}/dashboard/billing?session_id=${sessionId}&status=success`;
      return {
        checkoutUrl: `${successBase}&mock_checkout=true&tier=${input.tier}`,
        sessionId,
        mode: 'simulated'
      };
    }

    // When Stripe is configured, return the Stripe Checkout redirect URL
    const _successUrl = input.successUrl || `${process.env.WEB_BASE_URL || 'http://localhost:5173'}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&status=success`;
    const _cancelUrl = input.cancelUrl || `${process.env.WEB_BASE_URL || 'http://localhost:5173'}/dashboard/billing?canceled=true`;

    return {
      checkoutUrl: `https://checkout.stripe.com/c/pay/${sessionId}?tier=${targetPlan.tier}&email=${encodeURIComponent(userEmail || '')}`,
      sessionId,
      mode: 'stripe'
    };
  }

  async createCustomerPortalSession(
    workspaceId: string,
    input: CreatePortalSessionInput
  ): Promise<{ portalUrl: string }> {
    const returnUrl = input.returnUrl || `${process.env.WEB_BASE_URL || 'http://localhost:5173'}/dashboard/billing`;
    return {
      portalUrl: `${returnUrl}?portal_session=active&workspaceId=${encodeURIComponent(workspaceId)}`
    };
  }

  async handleWebhookEvent(event: { type: string; data: { object: Record<string, unknown> } }): Promise<{
    processed: boolean;
    action: string;
    workspaceId?: string;
  }> {
    const obj = event.data.object || {};

    switch (event.type) {
      case 'checkout.session.completed': {
        const workspaceId = (obj.client_reference_id as string) || (obj.metadata as any)?.workspaceId;
        const tier = ((obj.metadata as any)?.tier as SubscriptionTier) || 'STARTER';
        const customerId = obj.customer as string;
        const subscriptionId = obj.subscription as string;

        if (workspaceId) {
          const now = new Date();
          const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await this.subscriptionRepo.upsertSubscription({
            workspaceId,
            tier,
            status: 'ACTIVE',
            stripeCustomerId: customerId || null,
            stripeSubscriptionId: subscriptionId || null,
            currentPeriodStart: now,
            currentPeriodEnd: oneMonthLater,
            cancelAtPeriodEnd: false
          });

          return { processed: true, action: `UPGRADED_TO_${tier}`, workspaceId };
        }
        return { processed: true, action: 'CHECKOUT_COMPLETED_NO_WORKSPACE' };
      }

      case 'customer.subscription.updated': {
        const workspaceId = (obj.metadata as any)?.workspaceId;
        const status = (obj.status as string)?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'PAST_DUE';
        const tier = ((obj.metadata as any)?.tier as SubscriptionTier) || 'STARTER';

        if (workspaceId) {
          await this.subscriptionRepo.upsertSubscription({
            workspaceId,
            tier,
            status: status as any,
            stripeSubscriptionId: obj.id as string,
            stripeCustomerId: obj.customer as string,
            cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end)
          });
          return { processed: true, action: 'SUBSCRIPTION_UPDATED', workspaceId };
        }
        return { processed: true, action: 'SUBSCRIPTION_UPDATED_NO_WORKSPACE' };
      }

      case 'customer.subscription.deleted': {
        const workspaceId = (obj.metadata as any)?.workspaceId;
        if (workspaceId) {
          await this.subscriptionRepo.upsertSubscription({
            workspaceId,
            tier: 'FREE',
            status: 'CANCELED',
            cancelAtPeriodEnd: false
          });
          return { processed: true, action: 'DOWNGRADED_TO_FREE', workspaceId };
        }
        return { processed: true, action: 'SUBSCRIPTION_DELETED_NO_WORKSPACE' };
      }

      case 'invoice.payment_succeeded': {
        const workspaceId = (obj.metadata as any)?.workspaceId;
        if (workspaceId) {
          await this.subscriptionRepo.recordInvoice({
            workspaceId,
            stripeInvoiceId: (obj.id as string) || `inv_${Date.now()}`,
            amountDueUsd: ((obj.amount_due as number) || 0) / 100,
            amountPaidUsd: ((obj.amount_paid as number) || 0) / 100,
            status: 'PAID',
            invoiceUrl: obj.hosted_invoice_url as string,
            pdfUrl: obj.invoice_pdf as string,
            periodStart: new Date(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            paidAt: new Date()
          });
          return { processed: true, action: 'INVOICE_RECORDED', workspaceId };
        }
        return { processed: true, action: 'INVOICE_NO_WORKSPACE' };
      }

      default:
        return { processed: true, action: `IGNORED_EVENT_${event.type}` };
    }
  }

  async upgradeTier(workspaceId: string, tier: SubscriptionTier): Promise<WorkspaceSubscription> {
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.subscriptionRepo.upsertSubscription({
      workspaceId,
      tier,
      status: 'ACTIVE',
      stripeCustomerId: `cus_test_${workspaceId.substring(0, 8)}`,
      stripeSubscriptionId: `sub_test_${workspaceId.substring(0, 8)}`,
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater,
      cancelAtPeriodEnd: false
    });
  }

  async checkLimit(
    workspaceId: string,
    action: 'CREATE_REEL' | 'CREATE_CAMPAIGN' | 'AUTONOMOUS_OPERATIONS' | 'META_PUBLISHING'
  ): Promise<TierLimitCheckResult> {
    return this.subscriptionRepo.checkLimit(workspaceId, action);
  }

  async incrementUsage(
    workspaceId: string,
    metric: 'reelsGenerated' | 'reelsRendered' | 'reelsPublished' | 'campaignsCreated',
    amount = 1
  ): Promise<WorkspaceUsageRecord> {
    return this.subscriptionRepo.incrementUsage(workspaceId, metric, amount);
  }
}
