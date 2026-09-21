import { GoogleGenAI } from '@google/genai';
import type {
  AIProvider,
  AIProviderConfig,
  AIGenerationOptions,
  AITextResponse
} from '@vidsnapai/types';

export * from '@vidsnapai/types';

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'AI_PROVIDER_ERROR',
    public readonly status?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIProviderRateLimitError extends AIProviderError {
  constructor(
    message: string,
    public readonly provider: string = 'gemini',
    public readonly model: string = 'gemini-3.6-flash',
    public readonly retryAfter?: number,
    public readonly quotaMessage?: string
  ) {
    super(message, 'AI_QUOTA_EXHAUSTED', 429, false); // Quota/Rate limits must NOT be retried
    this.name = 'AIProviderRateLimitError';
  }
}

export class AIProviderTimeoutError extends AIProviderError {
  constructor(message: string) {
    super(message, 'TIMEOUT', 408, true);
    this.name = 'AIProviderTimeoutError';
  }
}

export class AIProviderAuthError extends AIProviderError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_FAILED', 401, false);
    this.name = 'AIProviderAuthError';
  }
}

export class AIProviderUnavailableError extends AIProviderError {
  constructor(message: string) {
    super(message, 'SERVICE_UNAVAILABLE', 503, true);
    this.name = 'AIProviderUnavailableError';
  }
}

export class AIProviderNotFoundError extends AIProviderError {
  constructor(message: string) {
    super(message, 'MODEL_NOT_FOUND', 404, false);
    this.name = 'AIProviderNotFoundError';
  }
}

export function normalizeGeminiModel(modelName?: string): string {
  const raw = (modelName || process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
  // Strip duplicate leading 'models/' or trailing slashes
  let clean = raw.replace(/^(models\/)+/, '').replace(/\/+$/, '');

  // Detect and migrate obsolete 2.0-flash model identifier
  if (clean === 'gemini-2.0-flash' || clean === 'gemini-2.0-flash-exp') {
    console.warn(`[AI Warning] Detected obsolete model "${clean}". Automatically normalizing to "gemini-3.6-flash". Please update your environment configuration.`);
    clean = 'gemini-3.6-flash';
  }

  return clean || 'gemini-3.6-flash';
}

export function logAIStartupDiagnostics(options?: { modelName?: string; apiKey?: string }): {
  provider: string;
  effectiveModel: string;
  hasApiKey: boolean;
} {
  const effectiveModel = normalizeGeminiModel(options?.modelName || process.env.GEMINI_MODEL);
  const hasKey = Boolean((options?.apiKey || process.env.GEMINI_API_KEY || '').trim());
  const provider = hasKey ? 'gemini' : 'mock';

  console.log(`[AI Startup Diagnostics] Provider: ${provider} | Effective Model: ${effectiveModel} | API Key Configured: ${hasKey ? 'YES' : 'NO'}`);
  return {
    provider,
    effectiveModel,
    hasApiKey: hasKey
  };
}

import { aiProviderStateManager } from './aiProviderState.js';
export * from './aiProviderState.js';

function classifyAIError(error: unknown, correlationId?: string): AIProviderError {
  const recorded = aiProviderStateManager.recordError('gemini', error);

  if (error instanceof AIProviderError) return error;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  const reqId = correlationId || `ai_req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const effectiveModel = normalizeGeminiModel(process.env.GEMINI_MODEL);

  if (
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('not_found') ||
    lower.includes('no longer available') ||
    lower.includes('is not found')
  ) {
    return new AIProviderNotFoundError(
      `[GeminiProvider] MODEL_NOT_FOUND (HTTP 404) [ReqID: ${reqId}]: Requested model "${effectiveModel}" is unavailable or not found. ` +
      `Please verify or update GEMINI_MODEL in your environment (recommended: gemini-3.6-flash). Raw error: ${msg}`
    );
  }
  if (
    lower.includes('429') ||
    lower.includes('resource exhausted') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    recorded.code === 'AI_QUOTA_EXHAUSTED'
  ) {
    return new AIProviderRateLimitError(
      `[GeminiProvider] AI_QUOTA_EXHAUSTED (HTTP 429) [ReqID: ${reqId}]: Daily quota or rate limit reached for model "${effectiveModel}". Immediate deterministic fallback triggered. Details: ${msg}`,
      'gemini',
      effectiveModel,
      recorded.retryAfterSeconds,
      msg
    );
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) {
    return new AIProviderTimeoutError(`[GeminiProvider] Request timed out [ReqID: ${reqId}]: ${msg}`);
  }
  if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
    return new AIProviderAuthError(`[GeminiProvider] Authentication failed [ReqID: ${reqId}]: ${msg}`);
  }
  if (lower.includes('500') || lower.includes('503') || lower.includes('unavailable') || lower.includes('network')) {
    return new AIProviderUnavailableError(`[GeminiProvider] Service temporarily unavailable [ReqID: ${reqId}]: ${msg}`);
  }

  return new AIProviderError(`[GeminiProvider] Operation failed [ReqID: ${reqId}]: ${msg}`, 'AI_PROVIDER_ERROR', 500, false);
}

async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; timeoutMs?: number; initialDelayMs?: number; correlationId?: string }
): Promise<T> {
  const correlationId = options?.correlationId || `ai_req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const readiness = aiProviderStateManager.canExecute('gemini');
  if (!readiness.allowed) {
    const effectiveModel = normalizeGeminiModel(process.env.GEMINI_MODEL);
    const retrySec = readiness.retryAfterMs ? Math.ceil(readiness.retryAfterMs / 1000) : undefined;
    throw new AIProviderRateLimitError(
      readiness.reason || `[GeminiProvider] Quota cooldown active for model "${effectiveModel}".`,
      'gemini',
      effectiveModel,
      retrySec
    );
  }

  const envRetries = process.env.GEMINI_MAX_RETRIES ? parseInt(process.env.GEMINI_MAX_RETRIES, 10) : 2;
  const maxRetries = options?.maxRetries ?? envRetries;
  const timeoutMs = options?.timeoutMs ?? 30000;
  const initialDelayMs = options?.initialDelayMs ?? 500;

  let lastError: AIProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new AIProviderTimeoutError(`Request exceeded timeout limit of ${timeoutMs}ms [ReqID: ${correlationId}]`));
        }, timeoutMs);
        timer.unref?.();
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      aiProviderStateManager.recordSuccess('gemini', 'generateContent');
      return result;
    } catch (err) {
      lastError = classifyAIError(err, correlationId);

      // Never retry 400, 401, 403, 404, 429
      if (!lastError.isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff with jitter for transient 5xx / timeout only
      const backoffDelay = Math.min(initialDelayMs * Math.pow(2, attempt) + Math.random() * 200, 4000);
      await new Promise((res) => setTimeout(res, backoffDelay));
    }
  }

  throw lastError || new AIProviderError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED');
}

export interface ExecuteAIOptions<T> {
  operation: string;
  primary: () => Promise<T>;
  fallback: (error: Error) => Promise<T> | T;
  metadata?: {
    workspaceId?: string;
    brandId?: string;
    runId?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
}

export interface ExecuteAIResult<T> {
  data: T;
  fallbackUsed: boolean;
  fallbackReason?: string;
  aiProvider: string;
  aiStatus: 'SUCCESS' | 'QUOTA_EXHAUSTED' | 'CONFIG_ERROR' | 'FALLBACK_USED';
  metadata?: Record<string, unknown>;
}

export async function executeAIWithFallback<T>(options: ExecuteAIOptions<T>): Promise<ExecuteAIResult<T>> {
  const { operation, primary, fallback, metadata } = options;
  const reqId = (metadata?.correlationId as string) || `ai_op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const data = await primary();
    return {
      data,
      fallbackUsed: false,
      aiProvider: 'gemini',
      aiStatus: 'SUCCESS',
      metadata: { ...metadata, correlationId: reqId }
    };
  } catch (err: unknown) {
    const classified = classifyAIError(err, reqId);
    let aiStatus: 'QUOTA_EXHAUSTED' | 'CONFIG_ERROR' | 'FALLBACK_USED' = 'FALLBACK_USED';
    let fallbackReason = classified.message;

    if (classified.code === 'AI_QUOTA_EXHAUSTED' || classified.status === 429) {
      aiStatus = 'QUOTA_EXHAUSTED';
      fallbackReason = 'AI_QUOTA_EXHAUSTED';
      console.warn(`[AI Fallback] ${operation} [ReqID: ${reqId}] - Gemini quota exhausted (429). Seamlessly using deterministic production fallback.`);
    } else if (classified.code === 'AUTHENTICATION_FAILED' || classified.code === 'MODEL_NOT_FOUND' || classified.status === 401 || classified.status === 403 || classified.status === 404) {
      aiStatus = 'CONFIG_ERROR';
      console.warn(`[AI Fallback] ${operation} [ReqID: ${reqId}] - Gemini configuration error (${classified.code}). Seamlessly using deterministic fallback.`);
    } else {
      console.warn(`[AI Fallback] ${operation} [ReqID: ${reqId}] - Gemini execution failed (${classified.code}). Seamlessly using deterministic fallback: ${classified.message}`);
    }

    const fallbackData = await fallback(classified);

    return {
      data: fallbackData,
      fallbackUsed: true,
      fallbackReason,
      aiProvider: 'gemini',
      aiStatus,
      metadata: {
        ...metadata,
        correlationId: reqId,
        fallbackError: classified.message,
        fallbackCode: classified.code
      }
    };
  }
}

export class GeminiProvider implements AIProvider {
  public readonly providerName = 'gemini';
  private ai: GoogleGenAI | null = null;
  private defaultModel: string;
  private apiKey: string;
  private fallbackProvider: MockAIProvider;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || '';
    this.defaultModel = normalizeGeminiModel(config.modelName);
    this.fallbackProvider = new MockAIProvider();
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      if (!this.apiKey) {
        throw new AIProviderAuthError(
          '[GeminiProvider] GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment.'
        );
      }
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.ai;
  }

  async generateText(prompt: string, options?: AIGenerationOptions): Promise<AITextResponse> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      if (process.env.NODE_ENV === 'test') {
        throw new AIProviderAuthError(
          '[GeminiProvider] GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment.'
        );
      }
      return this.fallbackProvider.generateText(prompt, options);
    }

    return withRetryAndTimeout(async () => {
      const client = this.getClient();
      const model = normalizeGeminiModel(options?.model || this.defaultModel);

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          systemInstruction: options?.systemInstruction
        }
      });

      const text = response.text || '';
      return {
        text,
        finishReason: response.candidates?.[0]?.finishReason,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0
        }
      };
    });
  }

  async generateStructured<T>(
    prompt: string,
    schema: unknown,
    options?: AIGenerationOptions
  ): Promise<T> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      if (process.env.NODE_ENV === 'test') {
        throw new AIProviderAuthError(
          '[GeminiProvider] GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment.'
        );
      }
      return this.fallbackProvider.generateStructured<T>(prompt, schema, options);
    }

    return withRetryAndTimeout(async () => {
      const client = this.getClient();
      const model = normalizeGeminiModel(options?.model || this.defaultModel);

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: options?.temperature,
          maxOutputTokens: options?.maxTokens,
          systemInstruction: options?.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema as Record<string, unknown>
        }
      });

      const text = response.text;
      if (!text) {
        throw new AIProviderError('[GeminiProvider] Received empty response from model', 'EMPTY_RESPONSE');
      }

      return JSON.parse(text) as T;
    });
  }
}

export class MockAIProvider implements AIProvider {
  public readonly providerName = 'mock_ai';

  async generateText(prompt: string, _options?: AIGenerationOptions): Promise<AITextResponse> {
    return {
      text: `[Mock AI Response for: ${prompt.slice(0, 50)}...]`,
      finishReason: 'STOP',
      usage: { promptTokens: 25, completionTokens: 50, totalTokens: 75 }
    };
  }

  async generateStructured<T>(
    prompt: string,
    schema: unknown,
    _options?: AIGenerationOptions
  ): Promise<T> {
    const schemaObj = (schema && typeof schema === 'object' ? schema : {}) as Record<string, unknown>;
    const properties = (schemaObj.properties || {}) as Record<string, unknown>;

    // 1. Brand DNA Mock Generation
    if ('identity' in properties && 'messaging' in properties && 'visualIdentity' in properties) {
      const brandMatch = prompt.match(/Brand Name:\s*([^\n]+)/i) || prompt.match(/Name:\s*([^\n]+)/i);
      const industryMatch = prompt.match(/Industry:\s*([^\n]+)/i);
      const descMatch = prompt.match(/Description:\s*([^\n]+)/i);
      const storyMatch = prompt.match(/Story:\s*([^\n]+)/i);
      const audienceMatch = prompt.match(/Target Audience:\s*([^\n]+)/i);
      const voiceMatch = prompt.match(/Brand Voice:\s*([^\n]+)/i);
      const personalityMatch = prompt.match(/Brand Personality:\s*([^\n]+)/i);
      const ctaMatch = prompt.match(/Primary CTA:\s*([^\n]+)/i);

      const brandName = brandMatch ? brandMatch[1].trim() : 'AeroDynamic Active';
      const industry = industryMatch ? industryMatch[1].trim() : 'Athletics & Apparel';
      const description = descMatch ? descMatch[1].trim() : 'High-performance activewear engineered for extreme endurance.';
      const story = storyMatch ? storyMatch[1].trim() : `Founded to create gear that moves naturally with the body.`;
      const audience = audienceMatch ? audienceMatch[1].trim() : 'Marathon runners and fitness enthusiasts';
      const primaryCta = ctaMatch ? ctaMatch[1].trim() : `Equip Your Journey`;

      const personality = personalityMatch
        ? personalityMatch[1].split(/[,/|]+/).map((s) => s.trim()).filter(Boolean)
        : ['Modern', 'Bold', 'Visionary', 'Approachable'];

      const tone = voiceMatch
        ? voiceMatch[1].split(/[,/|]+/).map((s) => s.trim()).filter(Boolean)
        : ['Confident', 'Empowering', 'Clear', 'Authoritative'];

      return {
        identity: {
          brandName,
          industry,
          story: story || `${brandName} was established to deliver best-in-class solutions for modern audiences.`,
          mission: description || `Empowering clients through excellence and innovation in ${industry}.`,
          personality: personality.length > 0 ? personality : ['Modern', 'Bold', 'Visionary', 'Approachable']
        },
        audience: {
          primaryAudience: audience || 'Modern Professionals & Fitness Enthusiasts',
          demographics: ['Age 24-48', 'Digital-native consumers', 'High-intent creators'],
          painPoints: ['Slow workflows', 'Lack of consistent creative quality', 'High operational friction'],
          desires: ['Effortless scale', 'High visual fidelity', 'Reliable ROI'],
          buyingMotivations: ['Time saved', 'Production value', 'Simplicity of adoption']
        },
        messaging: {
          positioning: `${brandName} is the premier innovative brand in ${industry}.`,
          coreMessage: description,
          valueProposition: `High-impact results with streamlined execution and modern design.`,
          usps: ['Engineered for speed', 'Studio-grade consistency', 'Effortless automation'],
          proofPoints: ['Loved by modern brands', 'Verified satisfaction', 'Built by industry experts'],
          tone: tone.length > 0 ? tone : ['Confident', 'Empowering', 'Clear', 'Authoritative'],
          forbiddenMessaging: ['Unrealistic instant overnight promises', 'Misleading guarantees']
        },
        products: [
          {
            name: `${brandName} Core Offering`,
            category: 'Core Offering',
            benefits: ['Accelerates turnaround', 'Maximizes performance output'],
            features: ['Smart automation', 'High-definition exports'],
            price: 68,
            usps: ['Industry-leading performance'],
            targetAudience: audience,
            offers: ['Special welcome offer'],
            cta: primaryCta
          }
        ],
        visualIdentity: {
          colors: { primary: '#3b82f6', secondary: '#1d4ed8' },
          typography: { headingFont: 'Outfit', bodyFont: 'Inter' },
          visualStyle: 'Sleek, high-contrast, modern cinematic typography and clean aesthetic framing',
          imageStyle: 'Warm natural ambient lighting with crisp product focus'
        },
        contentStrategy: {
          contentPillars: ['Endurance Training', 'Gear Technology', 'Athlete Spotlights', 'Nutrition Tips'],
          preferredTopics: ['Actionable reels', 'Transformation stories', 'Quick workflow tips'],
          educationalTopics: ['How-to guides', 'Best practice breakdowns', 'Common mistakes'],
          promotionalTopics: ['Feature spotlights', 'Limited offers', 'Use cases'],
          storytellingTopics: ['Founder journeys', 'Customer wins', 'Behind the design']
        },
        promotionRules: {
          primaryCTA: primaryCta,
          offers: ['Special introductory welcome discount'],
          claimsToAvoid: ['Guaranteed Olympic medal'],
          complianceRules: [],
          brandRestrictions: ['Maintain positive and authentic communication']
        }
      } as T;
    }

    // 2. Marketing Strategy Mock Generation
    if ('marketingGoal' in properties || ('positioning' in properties && 'funnelStrategy' in properties)) {
      return {
        objective: 'BRAND_AWARENESS',
        businessGoal: 'Grow customer acquisition and brand visibility',
        marketingGoal: 'Establish market presence through video-first content',
        targetAudience: {
          primarySegments: ['Growth-oriented businesses', 'Digital creators'],
          psychographics: ['Values speed', 'Aesthetic-driven', 'Seeks competitive advantage'],
          buyingTriggers: ['Bottlenecks in content creation', 'Desire to elevate brand look'],
          objectionsToOvercome: ['Setup time', 'Learning curve']
        },
        positioning: {
          marketCategory: 'AI-Native Content Engine',
          competitiveMoat: 'End-to-end multi-agent pipeline from Brand Brain to Final Reel',
          valuePropositionStatement: 'Create high-converting short-form video content in minutes.',
          differentiators: ['Autonomous orchestrator', 'Strict brand compliance', 'Integrated studio']
        },
        messagingStrategy: {
          brandNarrativeHook: 'The modern way to produce viral brand content effortlessly.',
          keyThemes: ['Creative Freedom', 'Unstoppable Speed', 'Studio Quality'],
          primaryAngles: ['Efficiency transformation', 'Creative supremacy', 'Cost optimization'],
          voiceGuidance: 'Inspiring, authoritative, clear and energetic.'
        },
        contentStrategy: {
          pillars: [
            {
              name: 'Creative Mastery',
              purpose: 'Educate audience on modern video tactics',
              audienceNeed: 'Better visual storytelling techniques',
              messagingAngle: 'Actionable breakdowns',
              recommendedFormats: ['SHORT_REEL', 'TALKING_HEAD_REEL']
            }
          ],
          contentMix: [
            { type: 'EDUCATIONAL', percentage: 40, purpose: 'Build authority', funnelStage: 'AWARENESS' },
            { type: 'PROMOTIONAL', percentage: 30, purpose: 'Drive conversions', funnelStage: 'CONVERSION' },
            { type: 'STORYTELLING', percentage: 30, purpose: 'Deepen trust', funnelStage: 'CONSIDERATION' }
          ],
          educationalThemes: ['Video pacing secrets', 'Hook blueprints', 'Audio layering'],
          promotionalThemes: ['Workflow comparison', 'Feature demos', 'Case studies'],
          storytellingThemes: ['From 0 to 1M views', 'Behind the production'],
          socialProofThemes: ['Customer reviews', 'Growth charts'],
          engagementThemes: ['This or that', 'Industry debates']
        },
        funnelStrategy: {
          stages: [
            {
              stage: 'AWARENESS',
              audienceState: 'Problem-aware',
              objective: 'Capture attention and ignite curiosity',
              messageFocus: 'Highlight content production challenges',
              contentRole: 'High-energy hook reels',
              ctaBehavior: 'Follow for more'
            },
            {
              stage: 'CONSIDERATION',
              audienceState: 'Solution-seeking',
              objective: 'Demonstrate unique value proposition',
              messageFocus: 'Showcase streamlined AI video pipeline',
              contentRole: 'Deep-dive walkthroughs',
              ctaBehavior: 'Explore the platform'
            },
            {
              stage: 'CONVERSION',
              audienceState: 'Decision-ready',
              objective: 'Drive immediate signups and trials',
              messageFocus: 'Risk-free trial and rapid results',
              contentRole: 'Customer transformation stories',
              ctaBehavior: 'Start Free Trial'
            },
            {
              stage: 'RETENTION',
              audienceState: 'Active user',
              objective: 'Maximize ongoing usage and advocacy',
              messageFocus: 'Advanced power-user features',
              contentRole: 'Pro-tier masterclasses',
              ctaBehavior: 'Share with a teammate'
            }
          ]
        },
        channelStrategy: {
          recommendedChannels: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'],
          channelGuidance: [
            {
              channel: 'INSTAGRAM',
              role: 'Aesthetic showcase and community hub',
              contentApproach: 'Polished reels with bold kinetic typography',
              formatGuidance: '9:16 vertical 15-30s videos',
              ctaStrategy: 'Link in bio and save for later'
            }
          ]
        },
        offerStrategy: {
          recommendedOffers: ['14-Day Pro Free Trial', 'Free Brand Brain Audit'],
          urgencyMechanisms: ['Limited beta onboarding slots'],
          riskReversals: ['Cancel anytime with one click']
        },
        kpiStrategy: {
          primaryKPIs: ['Monthly Recurring Revenue', 'Customer Acquisition Cost'],
          secondaryKPIs: ['Video Completion Rate', 'Engagement Rate'],
          awarenessKPIs: ['Total Reel Views', 'Follower Growth'],
          considerationKPIs: ['Website Clicks', 'Content Saves'],
          conversionKPIs: ['Free Trial Signups', 'Paid Conversions']
        },
        risksAndGuardrails: {
          claimsToAvoid: ['Guaranteed viral success'],
          restrictedTopics: ['Unverified performance statistics'],
          brandRestrictions: ['No direct negative competitor bashing'],
          toneRestrictions: ['Avoid overly corporate or dry jargon'],
          complianceNotes: ['Ensure all stock media has commercial usage rights']
        }
      } as T;
    }

    // 3. Campaign Strategy Mock Generation
    if ('corePromise' in properties || 'messagingAngles' in properties || ('funnel' in properties && 'channelStrategy' in properties)) {
      const brandMatch = prompt.match(/Brand:\s*([^\n(]+)/i);
      const campMatch = prompt.match(/Campaign Name:\s*([^\n]+)/i);
      const objMatch = prompt.match(/Campaign Objective:\s*([^\n]+)/i);
      const descMatch = prompt.match(/Campaign Description:\s*([^\n]+)/i);
      const offerMatch = prompt.match(/Offer \/ Incentive:\s*([^\n]+)/i);
      const ctaMatch = prompt.match(/Primary Call to Action:\s*([^\n]+)/i);
      const promiseMatch = prompt.match(/Campaign promise:\s*([^\n]+)/i) || prompt.match(/Core Campaign Message:\s*([^\n]+)/i);

      const brandName = brandMatch ? brandMatch[1].trim() : 'one8 by Virat Kohli';
      const _campaignName = campMatch ? campMatch[1].trim() : 'Brand Awareness Drive';
      const objective = objMatch ? objMatch[1].trim() : 'BRAND_AWARENESS';
      const _description = descMatch ? descMatch[1].trim() : 'Modern fashion and lifestyle essentials campaign';
      const offer = offerMatch ? offerMatch[1].trim() : 'Limited-time exclusive deals on selected products';
      const cta = ctaMatch ? ctaMatch[1].trim() : 'Shop Now';
      const corePromise = promiseMatch
        ? promiseMatch[1].trim()
        : 'Modern fashion and lifestyle essentials that help consumers express their individual style and confidence.';

      return {
        objective,
        audience: {
          primary: 'Digital-first fashion and lifestyle enthusiasts seeking authentic self-expression and modern confidence',
          secondary: 'Trend-conscious consumers and active urban professionals',
          painPoints: ['Overpriced generic apparel lacking distinct individuality', 'Inconsistent quality in everyday fashion'],
          desires: ['Express authentic personal style', 'Premium everyday lifestyle comfort', 'Versatile modern essentials'],
          motivations: ['Empowerment through athletic lifestyle identity', 'Value for premium craftsmanship and design']
        },
        positioning: `${brandName} empowers modern consumers with distinct, high-performance lifestyle and fashion essentials designed for effortless confidence.`,
        corePromise,
        keyMessages: [
          `Unapologetic style meets everyday comfort with ${brandName}.`,
          `Designed to keep you moving with purpose, confidence, and distinction.`,
          `${offer} — discover your signature fit today.`
        ],
        messagingAngles: [
          'Authentic Self-Expression & Everyday Confidence',
          'Modern Urban Versatility',
          'High-Performance Lifestyle Aesthetic'
        ],
        contentPillars: [
          'Style in Motion',
          'Behind the Craft',
          'Everyday Confidence Looks',
          'Community Spotlights'
        ],
        contentMix: [
          { type: 'EDUCATIONAL', percentage: 35, purpose: 'Style guides and fit breakdowns', funnelStage: 'AWARENESS' },
          { type: 'STORYTELLING', percentage: 35, purpose: 'Athlete lifestyle and brand origin journey', funnelStage: 'CONSIDERATION' },
          { type: 'PROMOTIONAL', percentage: 30, purpose: 'Spotlight limited-time curated deals', funnelStage: 'CONVERSION' }
        ],
        funnel: {
          awareness: {
            message: `Redefine your lifestyle wardrobe with signature pieces from ${brandName}.`,
            formatGuidance: 'High-energy 9:16 vertical short reels featuring dynamic street transitions and kinetic captions.',
            cta: 'Discover the Collection'
          },
          consideration: {
            message: `Experience the difference in premium fabric and bespoke cuts crafted for daily momentum.`,
            formatGuidance: 'Detailed lifestyle walkthroughs with focus on texture, fit versatility, and authentic styling.',
            cta: 'Explore Selected Fits'
          },
          conversion: {
            message: `Claim exclusive limited-time deals on signature ${brandName} apparel today before stock runs out.`,
            formatGuidance: 'Direct product showcases with countdown timers, clear benefit callouts, and offer badges.',
            cta: cta
          }
        },
        offerStrategy: offer,
        ctaStrategy: `Drive direct action across touchpoints using bold, high-clarity calls to action: ${cta}.`,
        channelStrategy: [
          {
            channel: 'INSTAGRAM',
            role: 'Primary visual showcase, creator collaboration, and aesthetic momentum',
            contentApproach: 'Cinematic reels, lookbooks, and influencer styling clips',
            formatGuidance: '9:16 high-contrast vertical reels (15-30s)',
            ctaStrategy: 'Shop in Bio'
          },
          {
            channel: 'TIKTOK',
            role: 'Trend-driven virality and organic discovery',
            contentApproach: 'Fast-paced transformation transitions and day-in-the-life lifestyle reels',
            formatGuidance: 'Vertical 9:16 video with trending audio and kinetic captions',
            ctaStrategy: 'Shop Now'
          },
          {
            channel: 'YOUTUBE_SHORTS',
            role: 'Broad reach and high-retention discovery',
            contentApproach: 'Curated styling tips and seasonal look breakdowns',
            formatGuidance: 'Vertical 9:16 video with strong 3-second visual hook',
            ctaStrategy: 'Check Out The Drop'
          }
        ],
        kpis: {
          primary: ['Total Video Views', 'Click-Through Rate (CTR)', 'Conversion Rate (CVR)', 'Return on Ad Spend (ROAS)'],
          targets: ['1,000,000+ targeted impressions', '3.5%+ CTR across reels', '2.5%+ store conversion rate']
        },
        guardrails: {
          claimsToAvoid: ['Guaranteed life-changing transformation', 'Unsubstantiated celebrity endorsements'],
          restrictions: ['Ensure all brand typography and color rules are strictly honored', 'Maintain authentic, positive brand tone']
        }
      } as T;
    }

    // 4. Content Plan Mock Generation
    if ('weeklyNarratives' in properties || 'planName' in properties || ('jobs' in properties && 'diversificationSummary' in properties)) {
      const brandMatch = prompt.match(/Brand Name:\s*([^\n]+)/i) || prompt.match(/for the brand\s*"([^"]+)"/i) || prompt.match(/Brand:\s*([^\n]+)/i);
      const brandName = brandMatch ? brandMatch[1].trim() : 'one8 by Virat Kohli';
      const durationMatch = prompt.match(/(\d+)-Day Content Plan/i) || prompt.match(/EXACTLY (\d+) individual content jobs/i);
      const durationDays = durationMatch ? parseInt(durationMatch[1], 10) : 30;

      const totalWeeks = Math.ceil(durationDays / 7);
      const weeklyNarratives = [];
      const narrativeTemplates = [
        { theme: 'Foundations & Brand Awareness', focus: 'AWARENESS', obj: 'Introduce brand aesthetic and frame category challenge' },
        { theme: 'Deep Value & Everyday Mastery', focus: 'CONSIDERATION', obj: 'Deliver high-utility style and performance breakdowns' },
        { theme: 'Social Proof & Product Spotlight', focus: 'CONSIDERATION', obj: 'Overcome objections and showcase customer wins' },
        { theme: 'High-Urgency Conversion', focus: 'CONVERSION', obj: 'Drive immediate purchases and exclusive drops' },
        { theme: 'Community & Retention', focus: 'RETENTION', obj: 'Celebrate customer stories and deepen brand loyalty' }
      ];

      for (let w = 1; w <= totalWeeks; w++) {
        const t = narrativeTemplates[(w - 1) % narrativeTemplates.length];
        weeklyNarratives.push({
          weekNumber: w,
          theme: `Week ${w}: ${t.theme}`,
          focusObjective: t.obj,
          funnelFocus: t.focus,
          strategicPurpose: `Guide prospects through week ${w} of the campaign funnel.`
        });
      }

      const pillars = ['Style in Motion', 'Behind the Craft', 'Everyday Confidence Looks', 'Community Spotlights'];
      const contentTypes = ['EDUCATIONAL', 'STORYTELLING', 'PROBLEM_AGITATION', 'BEHIND_THE_SCENES', 'SOCIAL_PROOF', 'PROMOTIONAL'];
      const formats = ['SHORT_REEL', 'TALKING_HEAD_REEL', 'PRODUCT_SHOWCASE_REEL', 'TUTORIAL_REEL'];
      const platforms = ['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS'];

      const jobs = [];
      for (let day = 1; day <= durationDays; day++) {
        const weekNumber = Math.ceil(day / 7);
        const funnelStage = weekNumber === 1 ? 'AWARENESS' : weekNumber === 2 ? 'CONSIDERATION' : weekNumber === 3 ? 'CONSIDERATION' : weekNumber === 4 ? (day % 2 === 0 ? 'CONVERSION' : 'CONSIDERATION') : 'RETENTION';
        const contentType = contentTypes[(day - 1) % contentTypes.length];
        const contentPillar = pillars[(day - 1) % pillars.length];
        const format = formats[(day - 1) % formats.length];
        const platform = platforms[(day - 1) % platforms.length];
        const priority = funnelStage === 'CONVERSION' ? 'HIGH' : day % 2 === 0 ? 'MEDIUM' : 'LOW';

        jobs.push({
          dayNumber: day,
          weekNumber,
          title: `Day ${day}: ${contentPillar} — ${contentType.replace(/_/g, ' ')}`,
          contentType,
          funnelStage,
          contentPillar,
          objective: `Drive ${funnelStage.toLowerCase()} and audience engagement for ${contentPillar}.`,
          audience: 'Fashion-forward youth, fitness enthusiasts, active lifestyle seekers',
          topic: `${contentPillar} styling and performance breakdown`,
          hook: day % 2 === 0
            ? `The one thing you're overlooking in your everyday style routine...`
            : `How ${brandName} is redefining modern lifestyle essentials...`,
          keyMessage: `Experience distinct craftsmanship and effortless confidence with ${brandName}.`,
          messagingAngle: 'Actionable lifestyle breakdown highlighting authentic confidence.',
          offer: funnelStage === 'CONVERSION' ? 'Limited-time exclusive deals on selected products' : null,
          cta: funnelStage === 'CONVERSION' ? 'Shop Now — Link in Bio' : 'Save this reel for style inspiration',
          platform,
          format,
          priority,
          suggestedVisualHook: 'Dynamic vertical cut featuring athletic lifestyle movement.',
          suggestedAudioConcept: 'Punchy upbeat rhythm with clean voiceover.',
          keyTakeaway: 'Elevate your daily look with confidence and comfort.',
          strategicRationale: `Positions ${brandName} effectively within the ${funnelStage} phase.`
        });
      }

      const funnelDistribution: Record<string, number> = {};
      const contentTypeDistribution: Record<string, number> = {};
      const formatDistribution: Record<string, number> = {};
      const pillarDistribution: Record<string, number> = {};

      for (const job of jobs) {
        funnelDistribution[job.funnelStage] = (funnelDistribution[job.funnelStage] || 0) + 1;
        contentTypeDistribution[job.contentType] = (contentTypeDistribution[job.contentType] || 0) + 1;
        formatDistribution[job.format] = (formatDistribution[job.format] || 0) + 1;
        pillarDistribution[job.contentPillar] = (pillarDistribution[job.contentPillar] || 0) + 1;
      }

      return {
        planName: `${brandName} ${durationDays}-Day Strategic Content Plan`,
        objective: 'Drive brand awareness, customer engagement, product discovery, and sales.',
        durationDays,
        campaignTheme: 'Modern fashion and lifestyle essentials that help consumers express their individual style and confidence.',
        executiveSummary: `A comprehensive ${durationDays}-day short-form video content calendar engineered to build awareness, consideration, and conversion.`,
        weeklyNarratives,
        diversificationSummary: {
          funnelDistribution,
          contentTypeDistribution,
          formatDistribution,
          pillarDistribution
        },
        jobs
      } as T;
    }

    // 5. Reel Blueprint Mock Generation
    if (('scenes' in properties && 'hook' in properties) || ('concept' in properties && 'script' in properties)) {
      const brandMatch = prompt.match(/Brand Name:\s*([^\n]+)/i) || prompt.match(/Brand:\s*([^\n]+)/i);
      const brandName = brandMatch ? brandMatch[1].trim() : 'Acme Corp';
      const topicMatch = prompt.match(/Topic:\s*([^\n]+)/i) || prompt.match(/Title:\s*([^\n]+)/i);
      const topic = topicMatch ? topicMatch[1].trim() : `${brandName} Innovation Spotlight`;
      const hookMatch = prompt.match(/Hook:\s*([^\n]+)/i);
      const hookText = hookMatch ? hookMatch[1].trim().replace(/^["']|["']$/g, '') : `Stop wasting hours on manual editing.`;
      const funnelMatch = prompt.match(/Funnel Stage:\s*([^\n]+)/i);
      const funnelStage = (funnelMatch && ['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION'].includes(funnelMatch[1].trim().toUpperCase()))
        ? funnelMatch[1].trim().toUpperCase()
        : 'AWARENESS';
      const pillarMatch = prompt.match(/Content Pillar:\s*([^\n]+)/i);
      const contentPillar = pillarMatch ? pillarMatch[1].trim() : 'AI Automation';
      const durationMatch = prompt.match(/(\d+)\s*seconds/i);
      const durationSeconds = durationMatch ? parseInt(durationMatch[1], 10) : 30;

      let scenes: any[] = [];
      let script: any[] = [];

      if (durationSeconds >= 25) {
        // 7-scene 30s commercial structure: 4s, 4s, 5s, 5s, 5s, 4s, 3s
        scenes = [
          {
            sceneNumber: 1,
            durationSeconds: 4.0,
            purpose: 'HOOK',
            narration: hookText,
            onScreenText: hookText.toUpperCase(),
            visualType: 'PROBLEM',
            subject: `Frustrated creator struggling with video creation`,
            environment: 'Dim modern creator workspace',
            composition: 'Close-up centered portrait 9:16',
            camera: 'Fast push-in',
            cameraMovement: 'FAST_PUSH_IN',
            lighting: 'High contrast dramatic rim lighting',
            mood: 'Urgent',
            transition: 'WHIP_PAN',
            transitionIntention: 'WHIP_PAN',
            animationIntent: 'Kinetic bold typography explosion',
            assetRequirement: 'Expressive creator hook visual',
            productReference: brandName,
            brandElement: 'None',
            emphasis: 'Hook impact and audience pain resonance',
            veoPrompt: `Photorealistic 9:16 vertical video. Dynamic fast push-in on a creator looking intensely frustrated. Cinematic side lighting, 4k commercial quality.`,
            veoNegativePrompt: 'blurry, distorted, low quality, cartoon, watermark, distorted faces',
            motion: 'Fast dynamic motion',
            productPreservationRules: 'Maintain authentic realistic tone',
            brandPreservationRules: 'Avoid premature logo reveal',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 2,
            durationSeconds: 4.0,
            purpose: 'PROBLEM / DESIRE',
            narration: `Traditional production is slow, repetitive, and expensive.`,
            onScreenText: 'TIRED OF SLOW EDITING?',
            visualType: 'PROBLEM',
            subject: 'Overwhelming timeline layers and render bars',
            environment: 'Chaotic editing screen in dark studio',
            composition: 'Medium shot centered 9:16',
            camera: 'Slow tracking forward',
            cameraMovement: 'SLOW_PAN',
            lighting: 'Cool blue ambient glow with warning accents',
            mood: 'Tense',
            transition: 'SMOOTH_CUT',
            transitionIntention: 'SMOOTH_CUT',
            animationIntent: 'Stressed glitch pulses and typography sweep',
            assetRequirement: 'Screen showing complex messy workflow',
            productReference: brandName,
            brandElement: 'None',
            emphasis: 'Agitating the core audience struggle',
            veoPrompt: `Cinematic 9:16 vertical shot of complex timeline clutter on dual monitors, dramatic atmospheric haze, 8k resolution.`,
            veoNegativePrompt: 'blurry, oversaturated, low res, glitchy text',
            motion: 'Subtle tense drift',
            productPreservationRules: 'Relatable realistic production environment',
            brandPreservationRules: 'Maintain color grading consistency',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 3,
            durationSeconds: 5.0,
            purpose: 'PRODUCT HERO',
            narration: `Meet ${brandName}. The autonomous video creation engine built for velocity.`,
            onScreenText: `INTRODUCING ${brandName.toUpperCase()}`,
            visualType: 'PRODUCT_HERO',
            subject: `${brandName} premium product presentation`,
            environment: 'Ultra-modern architectural studio with glowing pedestal',
            composition: 'Hero wide-angle centered 9:16 portrait',
            camera: '360 degree orbital sweep',
            cameraMovement: 'ORBIT',
            lighting: 'Soft luxury studio rim lighting with volumetric beams',
            mood: 'Aspirational',
            transition: 'GLOW_DISSOLVE',
            transitionIntention: 'GLOW_DISSOLVE',
            animationIntent: 'Sleek product reveal with chromatic edge flare',
            assetRequirement: 'Premium hero product presentation asset',
            productReference: brandName,
            brandElement: 'Brand Primary Colors',
            emphasis: 'Hero product elegance and authority',
            veoPrompt: `High-end commercial 9:16 portrait video of ${brandName} gleaming in luxury studio with soft volumetric god rays, elegant orbital camera glide, photorealistic, 8k.`,
            veoNegativePrompt: 'fake labels, low resolution, cheap rendering, cartoon, watermark',
            motion: 'Smooth luxury orbit',
            productPreservationRules: 'Do not modify product geometry or branding',
            brandPreservationRules: 'Strict brand color palette adherence',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 4,
            durationSeconds: 5.0,
            purpose: 'FEATURE',
            narration: `Powered by next-gen director intelligence and instant AI rendering.`,
            onScreenText: 'DIRECTOR-GRADE INTELLIGENCE',
            visualType: 'FEATURE_CALLOUT',
            subject: 'Intelligent generation engine in active flow',
            environment: 'Clean glassmorphic interface environment',
            composition: 'Close-up isometric 9:16',
            camera: 'Smooth dolly glide',
            cameraMovement: 'DOLLY_IN',
            lighting: 'Crisp neon accent edge lights',
            mood: 'Innovative',
            transition: 'ZOOM_IN',
            transitionIntention: 'ZOOM_IN',
            animationIntent: 'Animated feature callout badge with particle sparkles',
            assetRequirement: 'Interactive workflow feature demonstration',
            productReference: brandName,
            brandElement: 'Brand Accent Palette',
            emphasis: 'Concrete capability and speed',
            veoPrompt: `Cinematic macro shot of sleek glowing digital nodes organizing seamlessly into vertical video tracks, 9:16 vertical format, high tech elegance.`,
            veoNegativePrompt: 'messy, unreadable, distorted UI, glitchy',
            motion: 'Dynamic fluid node assembly',
            productPreservationRules: 'Accurate capability representation',
            brandPreservationRules: 'Brand color accents',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 5,
            durationSeconds: 5.0,
            purpose: 'BENEFIT',
            narration: `Create captivating, high-retention commercials in minutes without touching an editor.`,
            onScreenText: '10X FASTER PRODUCTION',
            visualType: 'TRANSFORMATION',
            subject: 'Creator relaxed and smiling at published viral video',
            environment: 'Bright sunlit creative penthouse studio',
            composition: 'Medium shot centered 9:16',
            camera: 'Warm upward pedestal tilt',
            cameraMovement: 'TILT_UP',
            lighting: 'Golden hour natural sunlight',
            mood: 'Empowered',
            transition: 'SMOOTH_CUT',
            transitionIntention: 'SMOOTH_CUT',
            animationIntent: 'Growth metric burst and glowing checkmarks',
            assetRequirement: 'Smiling creator enjoying transformed workflow',
            productReference: brandName,
            brandElement: 'Brand Identity',
            emphasis: 'Emotional payoff and time freedom',
            veoPrompt: `Cinematic lifestyle portrait 9:16 vertical video of a content creator smiling happily in a bright modern studio looking at their phone, golden hour lighting.`,
            veoNegativePrompt: 'deformed faces, low quality, oversaturated, blurry',
            motion: 'Gentle joyful movement',
            productPreservationRules: 'Consistent realistic lifestyle setting',
            brandPreservationRules: 'Warm premium brand tone',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 6,
            durationSeconds: 4.0,
            purpose: 'BRAND MOMENT',
            narration: `${brandName}. Where creativity meets automation.`,
            onScreenText: brandName.toUpperCase(),
            visualType: 'BRAND_IDENTITY',
            subject: `${brandName} official lockup with premium ambient glow`,
            environment: 'Sleek dark gradient backdrop with animated particle aura',
            composition: 'Centered brand lockup 9:16',
            camera: 'Static locked shot with gentle depth float',
            cameraMovement: 'STATIC_LOCK',
            lighting: 'Studio spotlight on logo',
            mood: 'Authoritative',
            transition: 'CROSS_DISSOLVE',
            transitionIntention: 'CROSS_DISSOLVE',
            animationIntent: 'Embossed logo sheen and typography glow',
            assetRequirement: 'High-resolution brand logo lockup',
            productReference: brandName,
            brandElement: 'Official Logo & Brand Mark',
            emphasis: 'Brand trust, authority, and identity',
            veoPrompt: `Sleek high-end 9:16 vertical commercial shot of premium brand emblem on dark luxury glass background with subtle light sweep, 8k commercial grade.`,
            veoNegativePrompt: 'fake logo, blurry, cheap font, artifacting',
            motion: 'Subtle light refraction sweep',
            productPreservationRules: 'Exact brand mark fidelity',
            brandPreservationRules: 'Strict logo geometry and color integrity',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 7,
            durationSeconds: 3.0,
            purpose: 'CTA',
            narration: `Start creating your next viral reel now. Link in bio.`,
            onScreenText: 'GET STARTED TODAY',
            visualType: 'CTA',
            subject: 'High-contrast branded endcard with button pill',
            environment: 'Clean dark gradient with brand color accents',
            composition: 'Wide shot centered 9:16',
            camera: 'Static lock',
            cameraMovement: 'STATIC_LOCK',
            lighting: 'Clean studio glow',
            mood: 'Decisive',
            transition: 'FADE_OUT',
            transitionIntention: 'FADE_OUT',
            animationIntent: 'Pulsing CTA button with gradient border shimmer',
            assetRequirement: 'Branded call to action endcard with logo and link indicator',
            productReference: brandName,
            brandElement: 'Full Brand Identity & CTA Button',
            emphasis: 'Immediate viewer action and conversion',
            veoPrompt: `Commercial end card 9:16 vertical video with subtle ambient glow and pulsing action button, premium studio finish.`,
            veoNegativePrompt: 'blurry, unreadable text, low res',
            motion: 'Gentle button glow pulse',
            productPreservationRules: 'Clear offer representation',
            brandPreservationRules: 'Strict CTA styling',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          }
        ];

        script = scenes.map((s, idx) => ({
          id: `seg-${idx + 1}`,
          purpose: s.purpose,
          text: s.narration,
          estimatedDuration: s.durationSeconds,
          deliveryStyle: idx === 0 ? 'Punchy' : idx === scenes.length - 1 ? 'Decisive' : 'Confident',
          emotionalTone: idx === 0 ? 'Engaging' : 'Authoritative'
        }));
      } else {
        // 4-scene short commercial structure (for 15s or 20s)
        const s1Dur = 4.0;
        const s2Dur = Math.max(3.0, Math.floor((durationSeconds - 7.0) / 2));
        const s3Dur = Math.max(3.0, durationSeconds - s1Dur - s2Dur - 3.0);
        const s4Dur = 3.0;

        scenes = [
          {
            sceneNumber: 1,
            durationSeconds: s1Dur,
            purpose: 'HOOK',
            narration: hookText,
            onScreenText: hookText.toUpperCase(),
            visualType: 'PROBLEM',
            subject: `Frustrated creator struggling with video creation`,
            environment: 'Dim modern creator workspace',
            composition: 'Close-up centered portrait 9:16',
            camera: 'Fast push-in',
            cameraMovement: 'FAST_PUSH_IN',
            lighting: 'High contrast dramatic rim lighting',
            mood: 'Urgent',
            transition: 'WHIP_PAN',
            transitionIntention: 'WHIP_PAN',
            animationIntent: 'Kinetic bold typography explosion',
            assetRequirement: 'Expressive creator hook visual',
            productReference: brandName,
            brandElement: 'None',
            emphasis: 'Hook impact and audience pain resonance',
            veoPrompt: `Photorealistic 9:16 vertical video. Dynamic fast push-in on a creator looking intensely frustrated. Cinematic side lighting, 4k commercial quality.`,
            veoNegativePrompt: 'blurry, distorted, low quality, cartoon, watermark, distorted faces',
            motion: 'Fast dynamic motion',
            productPreservationRules: 'Maintain authentic realistic tone',
            brandPreservationRules: 'Avoid premature logo reveal',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 2,
            durationSeconds: s2Dur,
            purpose: 'PRODUCT HERO',
            narration: `Meet ${brandName}. The autonomous video creation engine built for velocity.`,
            onScreenText: `MEET ${brandName.toUpperCase()}`,
            visualType: 'PRODUCT_HERO',
            subject: `${brandName} premium product presentation`,
            environment: 'Ultra-modern architectural studio with glowing pedestal',
            composition: 'Hero wide-angle centered 9:16 portrait',
            camera: '360 degree orbital sweep',
            cameraMovement: 'ORBIT',
            lighting: 'Soft luxury studio rim lighting',
            mood: 'Aspirational',
            transition: 'GLOW_DISSOLVE',
            transitionIntention: 'GLOW_DISSOLVE',
            animationIntent: 'Sleek product reveal with chromatic edge flare',
            assetRequirement: 'Premium hero product presentation asset',
            productReference: brandName,
            brandElement: 'Brand Primary Colors',
            emphasis: 'Hero product elegance and authority',
            veoPrompt: `High-end commercial 9:16 portrait video of ${brandName} gleaming in luxury studio with soft volumetric god rays, elegant orbital camera glide, photorealistic, 8k.`,
            veoNegativePrompt: 'fake labels, low resolution, cheap rendering, cartoon, watermark',
            motion: 'Smooth luxury orbit',
            productPreservationRules: 'Do not modify product geometry or branding',
            brandPreservationRules: 'Strict brand color palette adherence',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 3,
            durationSeconds: s3Dur,
            purpose: 'BENEFIT',
            narration: `Automate high-retention commercials in minutes with director-level quality.`,
            onScreenText: 'AUTONOMOUS REEL ENGINE',
            visualType: 'TRANSFORMATION',
            subject: 'Creator smiling at published high-performing video',
            environment: 'Bright sunlit creative penthouse studio',
            composition: 'Medium shot centered 9:16',
            camera: 'Smooth glide forward',
            cameraMovement: 'DOLLY_IN',
            lighting: 'Golden hour natural sunlight',
            mood: 'Empowered',
            transition: 'SMOOTH_CUT',
            transitionIntention: 'SMOOTH_CUT',
            animationIntent: 'Growth metric burst with glowing highlights',
            assetRequirement: 'Smiling creator enjoying transformed workflow',
            productReference: brandName,
            brandElement: 'Brand Identity',
            emphasis: 'Emotional payoff and time freedom',
            veoPrompt: `Cinematic lifestyle portrait 9:16 vertical video of a content creator smiling happily in a bright modern studio looking at their phone, golden hour lighting.`,
            veoNegativePrompt: 'deformed faces, low quality, oversaturated, blurry',
            motion: 'Gentle joyful movement',
            productPreservationRules: 'Consistent realistic lifestyle setting',
            brandPreservationRules: 'Warm premium brand tone',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          },
          {
            sceneNumber: 4,
            durationSeconds: s4Dur,
            purpose: 'CTA',
            narration: `Start creating with ${brandName} today. Link in bio.`,
            onScreenText: 'START CREATING NOW',
            visualType: 'CTA',
            subject: 'High-contrast branded endcard with button pill',
            environment: 'Clean modern dark gradient',
            composition: 'Wide shot centered 9:16',
            camera: 'Static lock',
            cameraMovement: 'STATIC_LOCK',
            lighting: 'Clean studio glow',
            mood: 'Decisive',
            transition: 'FADE_OUT',
            transitionIntention: 'FADE_OUT',
            animationIntent: 'Pulsing CTA button with gradient border shimmer',
            assetRequirement: 'Branded call to action endcard with logo and link indicator',
            productReference: brandName,
            brandElement: 'Full Brand Identity & CTA Button',
            emphasis: 'Immediate viewer action and conversion',
            veoPrompt: `Commercial end card 9:16 vertical video with subtle ambient glow and pulsing action button, premium studio finish.`,
            veoNegativePrompt: 'blurry, unreadable text, low res',
            motion: 'Gentle button glow pulse',
            productPreservationRules: 'Clear offer representation',
            brandPreservationRules: 'Strict CTA styling',
            textSafeComposition: true,
            referenceAssetIds: [],
            firstFrameAssetId: null,
            lastFrameAssetId: null
          }
        ];

        // Ensure sum equals exact durationSeconds
        const total = scenes.reduce((acc, s) => acc + s.durationSeconds, 0);
        const diff = durationSeconds - total;
        if (Math.abs(diff) > 0.01) {
          scenes[scenes.length - 1].durationSeconds = Number((scenes[scenes.length - 1].durationSeconds + diff).toFixed(2));
        }

        script = scenes.map((s, idx) => ({
          id: `seg-${idx + 1}`,
          purpose: s.purpose,
          text: s.narration,
          estimatedDuration: s.durationSeconds,
          deliveryStyle: idx === 0 ? 'Punchy' : idx === scenes.length - 1 ? 'Decisive' : 'Confident',
          emotionalTone: idx === 0 ? 'Engaging' : 'Authoritative'
        }));
      }

      return {
        title: topic,
        concept: {
          title: topic,
          concept: `High-impact vertical video breaking down ${topic} with cinematic visual transitions and kinetic captions.`,
          objective: `Drive audience engagement and ${funnelStage.toLowerCase()} for ${brandName}.`,
          targetAudience: 'Modern content creators, founders, and digital marketers',
          corePromise: 'Autonomous director-grade video production in minutes.',
          emotionalAngle: 'From frustration and slow turnaround to effortless velocity.',
          messagingAngle: 'Speed, consistency, and professional production standards.',
          contentPillar,
          funnelStage
        },
        objective: `Drive audience engagement and ${funnelStage.toLowerCase()} for ${brandName}.`,
        audience: 'Modern content creators, founders, and digital marketers',
        funnelStage,
        contentPillar,
        durationSeconds,
        aspectRatio: '9:16',
        platform: 'INSTAGRAM',
        format: 'REEL',
        hook: {
          type: 'QUESTION',
          text: hookText,
          visualIntent: 'Fast dynamic push-in on subject with bold pop text overlay.',
          deliveryStyle: 'Punchy and direct',
          durationSeconds: scenes[0].durationSeconds
        },
        narrative: `Discover how ${brandName} eliminates production bottlenecks and elevates creative execution.`,
        script,
        scenes,
        visualDirection: {
          style: 'Cinematic modern dark mode with vibrant neon accents',
          mood: 'High-energy and professional',
          colorIntent: 'Deep indigo with emerald green highlights',
          lightingIntent: 'Crisp studio rim lighting',
          composition: 'Strict 9:16 vertical framing with centered focal point',
          cameraLanguage: 'Dynamic rhythmic motion with seamless transitions',
          pacing: 'Fast-paced with punchy cuts',
          visualHierarchy: 'Subject first, followed by kinetic typography',
          brandIntegration: `${brandName} watermark and color palette throughout`,
          productEmphasis: 'Core software UI highlights'
        },
        voiceDirection: {
          style: 'Confident, clear, and modern creator tone',
          pace: 'Energetic (150-165 WPM)',
          tone: 'Authoritative yet approachable',
          genderPreference: 'ANY',
          language: 'en-US'
        },
        captionDirection: {
          style: 'High-contrast kinetic caption track with word highlight',
          placement: 'Bottom-third center',
          density: '2-4 words per burst',
          fontEmphasis: 'Heavy bold sans-serif with subtle drop shadow',
          animation: 'Scale-pop in synchronization with voiceover syllables'
        },
        animationDirection: {
          energy: 'High',
          style: 'Kinetic typography with spring easing',
          textAnimation: 'Word-by-word active highlight',
          visualTransitions: 'Whip pans and fast zooms between scenes',
          elementMotion: 'Subtle ambient particle drift'
        },
        audioDirection: {
          musicMood: 'Tech-forward electronic lo-fi with energetic bassline',
          soundEffects: 'Subtle whooshes on cuts and crisp clicks on text reveals',
          pacing: '124 BPM matching transition points',
          mixBalance: 'Voice 100%, Music 22%, SFX 35%'
        },
        cta: {
          type: 'LEARN_MORE',
          text: `Try ${brandName} Today`,
          visualTreatment: 'Gradient pill card with glowing border',
          placement: `Scene ${scenes.length} final 3 seconds`,
          url: null
        }
      } as T;
    }

    // Default generic fallback matching schema
    return {} as T;
  }
}

export function createAIProvider(config?: Partial<AIProviderConfig>): AIProvider {
  const apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
  const modelName = normalizeGeminiModel(config?.modelName || process.env.GEMINI_MODEL);

  if (apiKey && apiKey.trim().length > 0) {
    return new GeminiProvider({
      apiKey,
      modelName
    });
  }
  return new MockAIProvider();
}

export * from './veoProvider.js';

