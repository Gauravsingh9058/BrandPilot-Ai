import { AIProviderRateLimitError, type AIProvider } from '@vidsnapai/ai';
import type {
  ReelProductionPlan,
  ProductionMetadata
} from '@vidsnapai/types';
import { ReelAIOutputSchema, type ReelAIOutput } from '@vidsnapai/validation';
import { buildReelPrompt, type BuildReelPromptContext } from './prompts/reel-orchestration.prompt.js';
import { validateAndSanitizeReel } from './validators/reelValidator.js';
import { ReelProductionDirector } from './directors/reelProductionDirector.js';

export class ReelOrchestrator {
  constructor(private aiProvider: AIProvider) {}

  /**
   * Orchestrates autonomous generation of a structured Reel Production Plan blueprint.
   */
  async generateReelPlan(
    context: BuildReelPromptContext,
    options?: { version?: number }
  ): Promise<Omit<ReelProductionPlan, 'id' | 'createdAt' | 'updatedAt'>> {
    const prompt = buildReelPrompt(context);
    const targetDuration = context.input?.durationSeconds || 30;

    let rawOutput: unknown;
    try {
      rawOutput = await this.aiProvider.generateStructured<ReelAIOutput>(
        prompt,
        {
          type: 'object',
          properties: {
            title: { type: 'string' },
            concept: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                concept: { type: 'string' },
                objective: { type: 'string' },
                targetAudience: { type: 'string' },
                corePromise: { type: 'string' },
                emotionalAngle: { type: 'string' },
                messagingAngle: { type: 'string' },
                contentPillar: { type: 'string' },
                funnelStage: { type: 'string' }
              },
              required: ['title', 'concept', 'objective', 'targetAudience', 'corePromise', 'emotionalAngle', 'messagingAngle', 'contentPillar', 'funnelStage']
            },
            objective: { type: 'string' },
            audience: { type: 'string' },
            funnelStage: { type: 'string' },
            contentPillar: { type: 'string' },
            durationSeconds: { type: 'number' },
            aspectRatio: { type: 'string' },
            platform: { type: 'string' },
            format: { type: 'string' },
            hook: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                text: { type: 'string' },
                visualIntent: { type: 'string' },
                deliveryStyle: { type: 'string' },
                durationSeconds: { type: 'number' }
              },
              required: ['type', 'text', 'visualIntent', 'deliveryStyle', 'durationSeconds']
            },
            narrative: { type: 'string' },
            script: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  purpose: { type: 'string' },
                  text: { type: 'string' },
                  estimatedDuration: { type: 'number' },
                  deliveryStyle: { type: 'string' },
                  emotionalTone: { type: 'string' }
                },
                required: ['id', 'purpose', 'text', 'estimatedDuration', 'deliveryStyle', 'emotionalTone']
              }
            },
            scenes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sceneNumber: { type: 'number' },
                  durationSeconds: { type: 'number' },
                  purpose: { type: 'string' },
                  narration: { type: 'string' },
                  onScreenText: { type: 'string' },
                  visualType: { type: 'string' },
                  subject: { type: 'string' },
                  environment: { type: 'string' },
                  composition: { type: 'string' },
                  camera: { type: 'string' },
                  lighting: { type: 'string' },
                  mood: { type: 'string' },
                  transition: { type: 'string' },
                  animationIntent: { type: 'string' },
                  assetRequirement: { type: 'string' },
                  productReference: { type: 'string', nullable: true },
                  brandElement: { type: 'string', nullable: true },
                  emphasis: { type: 'string', nullable: true }
                },
                required: ['sceneNumber', 'durationSeconds', 'purpose', 'visualType', 'assetRequirement']
              }
            },
            visualDirection: {
              type: 'object',
              properties: {
                style: { type: 'string' },
                mood: { type: 'string' },
                colorIntent: { type: 'string' },
                lightingIntent: { type: 'string' },
                composition: { type: 'string' },
                cameraLanguage: { type: 'string' },
                pacing: { type: 'string' },
                visualHierarchy: { type: 'string' },
                brandIntegration: { type: 'string' },
                productEmphasis: { type: 'string' }
              }
            },
            voiceDirection: {
              type: 'object',
              properties: {
                style: { type: 'string' },
                pace: { type: 'string' },
                tone: { type: 'string' },
                genderPreference: { type: 'string' },
                language: { type: 'string' },
                accents: { type: 'string' }
              }
            },
            captionDirection: {
              type: 'object',
              properties: {
                style: { type: 'string' },
                placement: { type: 'string' },
                density: { type: 'string' },
                fontEmphasis: { type: 'string' },
                animation: { type: 'string' }
              }
            },
            animationDirection: {
              type: 'object',
              properties: {
                energy: { type: 'string' },
                style: { type: 'string' },
                textAnimation: { type: 'string' },
                visualTransitions: { type: 'string' },
                elementMotion: { type: 'string' }
              }
            },
            audioDirection: {
              type: 'object',
              properties: {
                musicMood: { type: 'string' },
                soundEffects: { type: 'string' },
                pacing: { type: 'string' },
                mixBalance: { type: 'string' }
              }
            },
            cta: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                text: { type: 'string' },
                visualTreatment: { type: 'string' },
                placement: { type: 'string' },
                url: { type: 'string', nullable: true }
              },
              required: ['type', 'text']
            }
          },
          required: ['title', 'concept', 'objective', 'audience', 'funnelStage', 'contentPillar', 'durationSeconds', 'hook', 'narrative', 'script', 'scenes', 'visualDirection', 'voiceDirection', 'captionDirection', 'animationDirection', 'audioDirection', 'cta']
        },
        { temperature: 0.7 }
      );
    } catch (err: unknown) {
      const isQuota = err instanceof AIProviderRateLimitError || (err as any)?.code === 'AI_QUOTA_EXHAUSTED' || (err as any)?.status === 429;
      const fallbackReason = isQuota ? 'AI_QUOTA_EXHAUSTED' : (err instanceof Error ? err.message : String(err));
      console.warn(`[ReelOrchestrator] AI generation call failed (${fallbackReason}). Engaging deterministic product-first reel generator.`);
      return this.generateDeterministicReelPlan(context, options, fallbackReason);
    }

    // Normalize raw output if wrapped or stringified
    let normalizedOutput = rawOutput;
    if (typeof normalizedOutput === 'string') {
      let cleaned = normalizedOutput.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }
      try {
        normalizedOutput = JSON.parse(cleaned.trim());
      } catch {
        // keep as is
      }
    }

    if (typeof normalizedOutput === 'object' && normalizedOutput !== null && !Array.isArray(normalizedOutput)) {
      const obj = normalizedOutput as Record<string, unknown>;
      const wrapperKeys = ['reel', 'blueprint', 'reelBlueprint', 'productionPlan', 'reelPlan', 'data', 'result', 'response'];
      for (const key of wrapperKeys) {
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          const nested = obj[key] as Record<string, unknown>;
          if ('title' in nested || 'scenes' in nested || 'hook' in nested) {
            normalizedOutput = nested;
            break;
          }
        }
      }
    }

    // Sanitize scenes visualType to match valid enum values
    if (typeof normalizedOutput === 'object' && normalizedOutput !== null && Array.isArray((normalizedOutput as any).scenes)) {
      for (const s of (normalizedOutput as any).scenes) {
        if (s && typeof s === 'object') {
          if (s.visualType === 'CTA_ENDCARD' || s.visualType === 'ENDCARD') s.visualType = 'CTA';
          if (s.visualType === 'PRODUCT' || s.visualType === 'HERO' || s.visualType === 'PRODUCT_HERO') s.visualType = 'PRODUCT_SHOWCASE';
          if (s.visualType === 'TALKING_HEAD') s.visualType = 'STORY';
          if (s.visualType === 'B_ROLL') s.visualType = 'LIFESTYLE';
          if (s.visualType === 'TEXT_ONLY') s.visualType = 'TEXT_FOCUS';
        }
      }
    }

    // Strict Zod schema validation
    const parsed = ReelAIOutputSchema.safeParse(normalizedOutput);
    if (!parsed.success) {
      throw new Error(
        `[ReelOrchestrator] Generated Reel blueprint failed schema validation: ${parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`
      );
    }

    // Deterministic semantic & guardrail validation
    const validationResult = validateAndSanitizeReel(parsed.data, {
      targetDurationSeconds: targetDuration,
      brand: context.brand,
      products: context.products,
      contentJob: context.contentJob
    });

    if (!validationResult.valid) {
      throw new Error(
        `[ReelOrchestrator] Reel blueprint failed semantic validation: ${validationResult.errors.join('; ')}`
      );
    }

    const sanitized = validationResult.sanitizedOutput;

    const productionMetadata: ProductionMetadata = {
      totalScenes: sanitized.scenes.length,
      estimatedWordCount: validationResult.wordCount,
      targetDurationSeconds: targetDuration,
      calculatedDurationSeconds: validationResult.calculatedDuration,
      generatedBy: 'VidSnapAI Reel Orchestrator v5.0',
      brandDnaVersion: context.brandDna?.version,
      marketingStrategyId: context.marketingStrategy?.id,
      campaignId: context.campaign?.id,
      contentJobId: context.contentJob.id,
      generatedAt: new Date().toISOString(),
      complianceNotes: validationResult.complianceNotes,
      warningFlags: validationResult.warningFlags
    };

    return {
      contentJobId: context.contentJob.id,
      brandId: context.brand.id,
      campaignId: context.campaign?.id || null,
      contentPlanId: context.contentJob.contentPlanId,
      workspaceId: context.contentJob.workspaceId,
      version: options?.version ?? 1,
      title: sanitized.title,
      concept: sanitized.concept,
      objective: sanitized.objective,
      audience: sanitized.audience,
      funnelStage: sanitized.funnelStage,
      contentPillar: sanitized.contentPillar,
      durationSeconds: sanitized.durationSeconds,
      aspectRatio: sanitized.aspectRatio || '9:16',
      platform: sanitized.platform || 'INSTAGRAM',
      format: sanitized.format || 'REEL',
      hook: sanitized.hook,
      narrative: sanitized.narrative,
      script: sanitized.script,
      scenes: sanitized.scenes,
      visualDirection: sanitized.visualDirection,
      voiceDirection: sanitized.voiceDirection,
      captionDirection: sanitized.captionDirection,
      animationDirection: sanitized.animationDirection,
      audioDirection: sanitized.audioDirection,
      cta: sanitized.cta,
      productionMetadata,
      status: 'READY'
    };
  }

  /**
   * Deterministic production fallback for Reel Blueprint generation.
   * Produces a rich, 6-scene product-first brand promotion blueprint.
   */
  generateDeterministicReelPlan(
    context: BuildReelPromptContext,
    options?: { version?: number },
    fallbackReason: string = 'AI_QUOTA_EXHAUSTED'
  ): Omit<ReelProductionPlan, 'id' | 'createdAt' | 'updatedAt'> {
    const { brand, products = [], contentJob, brandDna, campaign, marketingStrategy } = context;
    const targetDuration = context.input?.durationSeconds || 30;

    // Resolve target product
    const targetProduct = products.find((p) => p.id === (contentJob as any).productId) || products[0] || {
      id: 'prod_default',
      name: brand.name,
      description: brand.description || 'Premium activewear and lifestyle performance gear.'
    };

    const deterministicBlueprint: ReelAIOutput = ReelProductionDirector.directCommercialBlueprint({
      brand: context.brand,
      brandDna: context.brandDna,
      product: targetProduct as any,
      products: context.products,
      marketingStrategy: context.marketingStrategy,
      campaign: context.campaign,
      contentJob: context.contentJob,
      optimizationContext: context.optimizationContext,
      brandAssets: context.brandAssets,
      productAssets: context.productAssets,
      targetDurationSeconds: targetDuration
    });

    // Run standard semantic and guardrail validation
    const validationResult = validateAndSanitizeReel(deterministicBlueprint, {
      targetDurationSeconds: targetDuration,
      brand: context.brand,
      products: context.products,
      contentJob: context.contentJob
    });

    const sanitized = validationResult.sanitizedOutput;

    const productionMetadata: ProductionMetadata = {
      totalScenes: sanitized.scenes.length,
      estimatedWordCount: validationResult.wordCount,
      targetDurationSeconds: targetDuration,
      calculatedDurationSeconds: validationResult.calculatedDuration,
      generatedBy: 'VidSnapAI Reel Orchestrator v5.0 (Deterministic Fallback)',
      aiProvider: 'deterministic_fallback',
      fallbackUsed: true,
      fallbackReason: fallbackReason || 'AI_QUOTA_EXHAUSTED',
      brandDnaVersion: brandDna?.version,
      marketingStrategyId: marketingStrategy?.id,
      campaignId: campaign?.id,
      contentJobId: contentJob.id,
      generatedAt: new Date().toISOString(),
      complianceNotes: validationResult.complianceNotes,
      warningFlags: [...validationResult.warningFlags, `Deterministic fallback used: ${fallbackReason}`]
    };

    return {
      contentJobId: contentJob.id,
      brandId: brand.id,
      campaignId: campaign?.id || null,
      contentPlanId: contentJob.contentPlanId,
      workspaceId: contentJob.workspaceId,
      version: options?.version ?? 1,
      title: sanitized.title,
      concept: sanitized.concept,
      objective: sanitized.objective,
      audience: sanitized.audience,
      funnelStage: sanitized.funnelStage,
      contentPillar: sanitized.contentPillar,
      durationSeconds: sanitized.durationSeconds,
      aspectRatio: sanitized.aspectRatio || '9:16',
      platform: sanitized.platform || 'INSTAGRAM',
      format: sanitized.format || 'REEL',
      hook: sanitized.hook,
      narrative: sanitized.narrative,
      script: sanitized.script,
      scenes: sanitized.scenes,
      visualDirection: sanitized.visualDirection,
      voiceDirection: sanitized.voiceDirection,
      captionDirection: sanitized.captionDirection,
      animationDirection: sanitized.animationDirection,
      audioDirection: sanitized.audioDirection,
      cta: sanitized.cta,
      productionMetadata,
      status: 'READY'
    };
  }
}
