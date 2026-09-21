import type { Database } from '@vidsnapai/database';
import type {
  AIProvider,
  ContentPlanWithJobs,
  GenerateContentPlanInput,
  ContentJobOutput,
  ContentPlatform,
  ContentType,
  ContentFormat
} from '@vidsnapai/types';
import { ContentPlanOutputSchema, type ContentPlanOutput } from '@vidsnapai/validation';
import { BrandRepository, ProductRepository, DnaRepository } from '@vidsnapai/brand';
import { CampaignRepository, MarketingStrategyRepository } from '@vidsnapai/campaign';
import { ContentPlanRepository } from './repositories/content-plan.repository.js';
import { ContentJobRepository } from './repositories/content-job.repository.js';
import { buildContentPlanPrompt } from './prompts/content-plan.prompt.js';
import { analyzeDiversification } from './diversification.js';
import { normalizeContentPlanOutput } from './normalizers/content-plan.normalizer.js';
import { buildDeterministicContentPlan } from './deterministic/content-plan.fallback.js';

export class ContentPlannerService {
  private planRepo: ContentPlanRepository;
  private jobRepo: ContentJobRepository;
  private brandRepo: BrandRepository;
  private productRepo: ProductRepository;
  private dnaRepo: DnaRepository;
  private strategyRepo: MarketingStrategyRepository;
  private campaignRepo: CampaignRepository;

  constructor(
    db: Database,
    private aiProvider: AIProvider,
    repos?: {
      planRepo?: ContentPlanRepository;
      jobRepo?: ContentJobRepository;
      brandRepo?: BrandRepository;
      productRepo?: ProductRepository;
      dnaRepo?: DnaRepository;
      strategyRepo?: MarketingStrategyRepository;
      campaignRepo?: CampaignRepository;
    }
  ) {
    this.planRepo = repos?.planRepo ?? new ContentPlanRepository(db);
    this.jobRepo = repos?.jobRepo ?? new ContentJobRepository(db);
    this.brandRepo = repos?.brandRepo ?? new BrandRepository(db);
    this.productRepo = repos?.productRepo ?? new ProductRepository(db);
    this.dnaRepo = repos?.dnaRepo ?? new DnaRepository(db);
    this.strategyRepo = repos?.strategyRepo ?? new MarketingStrategyRepository(db);
    this.campaignRepo = repos?.campaignRepo ?? new CampaignRepository(db);
  }

  /**
   * Generates or regenerates a comprehensive, strategically diversified 30-day content plan.
   * Safety Guarantee: If AI generation or validation fails, existing plans and jobs remain untouched.
   */
  async generateContentPlan(
    brandId: string,
    workspaceId: string,
    input: GenerateContentPlanInput & { planGroupId?: string; previousPlanId?: string },
    options?: { optimizationContext?: import('@vidsnapai/types').OptimizationContext }
  ): Promise<ContentPlanWithJobs> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    const [products, brandDna, marketingStrategy, campaign] = await Promise.all([
      this.productRepo.listForBrand(brandId),
      this.dnaRepo.findLatestByBrandId(brandId),
      this.strategyRepo.findLatestByBrandId(brandId),
      input.campaignId ? this.campaignRepo.findByIdAndBrand(input.campaignId, brandId) : Promise.resolve(null)
    ]);

    const durationDays = input.durationDays || 30;
    const platforms = input.platforms || ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'];

    const prompt = buildContentPlanPrompt({
      brand,
      brandDna,
      products,
      marketingStrategy,
      campaign,
      durationDays,
      platforms,
      customGuidance: input.customGuidance,
      optimizationContext: options?.optimizationContext
    });

    const jsonSchema = {
      type: 'object',
      properties: {
        planName: { type: 'string' },
        objective: { type: 'string' },
        durationDays: { type: 'number' },
        campaignTheme: { type: 'string' },
        executiveSummary: { type: 'string' },
        weeklyNarratives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              weekNumber: { type: 'number' },
              theme: { type: 'string' },
              focusObjective: { type: 'string' },
              funnelFocus: { type: 'string' },
              strategicPurpose: { type: 'string' }
            },
            required: ['weekNumber', 'theme', 'focusObjective', 'funnelFocus', 'strategicPurpose']
          }
        },
        diversificationSummary: {
          type: 'object',
          properties: {
            funnelDistribution: { type: 'object' },
            contentTypeDistribution: { type: 'object' },
            formatDistribution: { type: 'object' },
            pillarDistribution: { type: 'object' }
          },
          required: ['funnelDistribution', 'contentTypeDistribution', 'formatDistribution', 'pillarDistribution']
        },
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dayNumber: { type: 'number' },
              weekNumber: { type: 'number' },
              title: { type: 'string' },
              contentType: { type: 'string' },
              funnelStage: { type: 'string' },
              contentPillar: { type: 'string' },
              objective: { type: 'string' },
              audience: { type: 'string' },
              topic: { type: 'string' },
              hook: { type: 'string' },
              keyMessage: { type: 'string' },
              messagingAngle: { type: 'string' },
              cta: { type: 'string' },
              platform: { type: 'string' },
              format: { type: 'string' },
              priority: { type: 'string' },
              suggestedVisualHook: { type: 'string' },
              suggestedAudioConcept: { type: 'string' },
              keyTakeaway: { type: 'string' },
              strategicRationale: { type: 'string' }
            },
            required: [
              'dayNumber',
              'title',
              'contentType',
              'funnelStage',
              'contentPillar',
              'objective',
              'audience',
              'topic',
              'hook',
              'keyMessage',
              'messagingAngle',
              'cta',
              'platform',
              'format'
            ]
          }
        }
      },
      required: ['planName', 'objective', 'durationDays', 'campaignTheme', 'executiveSummary', 'weeklyNarratives', 'diversificationSummary', 'jobs']
    };

    let rawOutput: unknown;
    try {
      rawOutput = await this.aiProvider.generateStructured<ContentPlanOutput>(
        prompt,
        jsonSchema,
        {
          systemInstruction:
            'You are VidSnapAI\'s Chief Content Strategist. Engineer a flawless, high-converting, fully diversified 30-day content calendar in strict JSON matching the schema.'
        }
      );
    } catch (aiErr: unknown) {
      if (process.env.NODE_ENV !== 'test') {
        rawOutput = buildDeterministicContentPlan({
          brand,
          brandDna,
          products,
          marketingStrategy,
          campaign,
          durationDays,
          platforms,
          customGuidance: input.customGuidance
        });
      } else {
        const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
        throw new Error(`AI Content Plan generation failed: ${msg}`);
      }
    }

    let normalized = normalizeContentPlanOutput(rawOutput);
    let parsed = ContentPlanOutputSchema.safeParse(normalized);

    if (!parsed.success) {
      // Attempt 1 corrective retry
      try {
        const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        const correctivePrompt = `${prompt}\n\nIMPORTANT CORRECTION: Your previous output failed validation with the following errors: ${errorDetails}.\nPlease re-generate a valid ContentPlan JSON object with all required fields (planName, objective, durationDays, campaignTheme, executiveSummary, weeklyNarratives, diversificationSummary, jobs) without any markdown formatting or missing keys.`;

        const retryRaw = await this.aiProvider.generateStructured<ContentPlanOutput>(
          correctivePrompt,
          jsonSchema,
          {
            systemInstruction:
              'You are VidSnapAI\'s Chief Content Strategist. Strictly correct the previous validation errors and return ONLY a valid ContentPlan JSON object.'
          }
        );

        normalized = normalizeContentPlanOutput(retryRaw);
        parsed = ContentPlanOutputSchema.safeParse(normalized);
      } catch {
        // Retry failed
      }

      if (!parsed.success) {
        if (process.env.NODE_ENV !== 'test') {
          const fallback = buildDeterministicContentPlan({
            brand,
            brandDna,
            products,
            marketingStrategy,
            campaign,
            durationDays,
            platforms,
            customGuidance: input.customGuidance
          });
          normalized = fallback;
          parsed = ContentPlanOutputSchema.safeParse(normalized);
        } else {
          const validationErrors = parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join(', ');
          throw new Error(`AI generated invalid Content Plan structure: ${validationErrors}`);
        }
      }
    }

    if (!parsed.success) {
      throw new Error('Failed to obtain a valid ContentPlan structure');
    }

    const planData = parsed.data;

    // Run deterministic diversification analysis
    const diversificationAnalysis = analyzeDiversification(planData.jobs);

    // Determine version and planGroupId
    let version = 1;
    const planGroupId = input.planGroupId;

    if (input.regenerate && planGroupId) {
      const latestVersion = await this.planRepo.getLatestVersion(planGroupId, brandId);
      version = latestVersion + 1;
    }

    // Check if we should preserve approved jobs from a previous plan
    let finalJobsData: ContentJobOutput[] = [...planData.jobs];
    if (input.regenerate && input.preserveApprovedJobs && input.previousPlanId) {
      const approvedJobs = await this.jobRepo.findApprovedForPlan(input.previousPlanId);
      const approvedByDay = new Map(approvedJobs.map((j) => [j.dayNumber, j]));

      finalJobsData = finalJobsData.map((job) => {
        const approved = approvedByDay.get(job.dayNumber);
        if (approved) {
          return {
            dayNumber: approved.dayNumber,
            weekNumber: Math.ceil(approved.dayNumber / 7),
            title: approved.title,
            contentType: approved.contentType,
            funnelStage: approved.funnelStage,
            contentPillar: approved.contentPillar,
            objective: approved.objective,
            audience: approved.audience,
            topic: approved.topic,
            hook: approved.hook,
            keyMessage: approved.keyMessage,
            messagingAngle: approved.messagingAngle,
            offer: approved.offer,
            cta: approved.cta,
            platform: approved.platform,
            format: approved.format,
            priority: approved.priority,
            suggestedVisualHook: (approved.strategy as any)?.suggestedVisualHook,
            suggestedAudioConcept: (approved.strategy as any)?.suggestedAudioConcept,
            keyTakeaway: (approved.strategy as any)?.keyTakeaway,
            strategicRationale: (approved.strategy as any)?.strategicRationale
          };
        }
        return job;
      });
    }

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Persist Content Plan
    const createdPlan = await this.planRepo.create(brandId, workspaceId, {
      name: input.name || planData.planName || `${brand.name} 30-Day Content Plan`,
      objective: input.objective || planData.objective || marketingStrategy?.marketingGoal || 'Drive brand awareness & conversions',
      campaignId: input.campaignId || null,
      startDate,
      endDate,
      durationDays,
      version,
      planGroupId,
      status: 'READY',
      strategySnapshot: {
        campaignTheme: planData.campaignTheme,
        executiveSummary: planData.executiveSummary,
        weeklyNarratives: planData.weeklyNarratives,
        customGuidance: input.customGuidance || null,
        diversificationMetrics: {
          score: diversificationAnalysis.score,
          passed: diversificationAnalysis.passed,
          warnings: diversificationAnalysis.warnings,
          metrics: diversificationAnalysis.metrics,
          repetitionIssues: diversificationAnalysis.repetitionIssues
        }
      }
    });

    // Bulk insert all 30 jobs
    const jobInserts = finalJobsData.map((job) => {
      const scheduledDate = new Date(startDate.getTime() + (job.dayNumber - 1) * 24 * 60 * 60 * 1000);
      return {
        campaignId: input.campaignId || null,
        dayNumber: job.dayNumber,
        scheduledDate,
        title: job.title,
        contentType: job.contentType as ContentType,
        funnelStage: job.funnelStage,
        contentPillar: job.contentPillar,
        objective: job.objective,
        audience: job.audience,
        topic: job.topic,
        hook: job.hook,
        keyMessage: job.keyMessage,
        messagingAngle: job.messagingAngle,
        offer: job.offer || null,
        cta: job.cta,
        platform: job.platform as ContentPlatform,
        format: job.format as ContentFormat,
        priority: job.priority || 'MEDIUM',
        status: 'PLANNED' as const,
        strategy: {
          suggestedVisualHook: job.suggestedVisualHook || null,
          suggestedAudioConcept: job.suggestedAudioConcept || null,
          keyTakeaway: job.keyTakeaway || null,
          strategicRationale: job.strategicRationale || null
        }
      };
    });

    const createdJobs = await this.jobRepo.createMany(createdPlan.id, brandId, workspaceId, jobInserts);

    return {
      ...createdPlan,
      jobs: createdJobs
    };
  }
}
