import { z } from 'zod';

// ==========================================
// Authentication Schemas
// ==========================================
export const SignupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ==========================================
// Workspace Schemas
// ==========================================
export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name cannot exceed 50 characters')
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

export const AddWorkspaceMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address to invite'),
  role: z.enum(['ADMIN', 'MEMBER'], {
    errorMap: () => ({ message: 'Role must be either ADMIN or MEMBER' })
  })
});

export type AddWorkspaceMemberInput = z.infer<typeof AddWorkspaceMemberSchema>;

// ==========================================
// Environment Variables Schema
// ==========================================
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    API_BASE_URL: z.string().url().default('http://localhost:4000'),
    WEB_BASE_URL: z.string().url().default('http://localhost:5173'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    SESSION_SECRET: z
      .string()
      .min(32, 'SESSION_SECRET must be at least 32 characters long for security'),
    COOKIE_DOMAIN: z.string().optional().default('localhost'),
    COOKIE_SECURE: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .or(z.boolean())
      .default(false),
    GEMINI_API_KEY: z.string().optional().default(''),
    GEMINI_MODEL: z.string().optional().default('gemini-3.6-flash'),
    VEO_MODEL: z.string().optional().default('veo-3.1-generate-preview'),
    VEO_ENABLED: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .or(z.boolean())
      .default(true),
    VEO_DEFAULT_RESOLUTION: z.enum(['720p', '1080p']).optional().default('720p'),
    VEO_DEFAULT_ASPECT_RATIO: z.enum(['9:16', '16:9', '1:1']).optional().default('9:16'),
    VEO_DEFAULT_DURATION: z.coerce.number().optional().default(8),
    PEXELS_API_KEY: z.string().optional().default(''),
    STORAGE_PROVIDER: z.string().optional().default('local'),
    STORAGE_BUCKET: z.string().optional().default('vidsnapai-assets'),
    VOICE_PROVIDER: z.string().optional().default('elevenlabs'),
    META_APP_ID: z.string().optional().default(''),
    META_APP_SECRET: z.string().optional().default(''),
    META_API_VERSION: z.string().optional().default('v19.0'),
    META_REDIRECT_URI: z.string().optional().default(''),
    META_ACCESS_TOKEN: z.string().optional().default(''),
    STRIPE_SECRET_KEY: z.string().optional().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
    STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional().default('us-east-1'),
    S3_ACCESS_KEY_ID: z.string().optional().default(''),
    S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
    S3_BUCKET: z.string().optional().default('vidsnapai-assets'),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.string().optional().default('false')
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production mode for cookie security'
        });
      }
      if (
        data.SESSION_SECRET.includes('development') ||
        data.SESSION_SECRET.includes('placeholder') ||
        data.SESSION_SECRET.includes('change_me')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'SESSION_SECRET contains insecure development placeholder in production'
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof EnvSchema>;

// ==========================================
// Queue Job Schemas
// ==========================================
export const TestJobSchema = z.object({
  id: z.string().uuid(),
  message: z.string().min(1),
  timestamp: z.number(),
  triggeredBy: z.string().optional()
});

export type TestJobPayloadInput = z.infer<typeof TestJobSchema>;

// ==========================================
// Phase 2: Brand Brain Schemas
// ==========================================

export const BrandColorsSchema = z.object({
  primary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional().or(z.literal('')),
  secondary: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional().or(z.literal('')),
  accent: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').optional().or(z.literal('')),
  background: z.string().optional(),
  text: z.string().optional()
}).optional().default({});

export const BrandTypographySchema = z.object({
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  accentFont: z.string().optional()
}).optional().default({});

export const MarketingRulesSchema = z.object({
  claimsToAvoid: z.array(z.string()).optional().default([]),
  brandRestrictions: z.array(z.string()).optional().default([]),
  complianceRules: z.array(z.string()).optional().default([])
}).optional().default({});

export const CreateBrandSchema = z.object({
  name: z.string().trim().min(2, 'Brand name must be at least 2 characters').max(100, 'Brand name cannot exceed 100 characters'),
  description: z.string().trim().min(10, 'Brand description must be at least 10 characters').max(2000, 'Description too long'),
  websiteUrl: z.string().url('Invalid website URL format').optional().or(z.literal('')).nullable(),
  story: z.string().max(3000, 'Story too long').optional().nullable(),
  industry: z.string().trim().min(2, 'Industry is required').max(100),
  targetAudience: z.string().max(2000, 'Target audience text too long').optional().nullable(),
  brandVoice: z.string().max(255).optional().nullable(),
  brandPersonality: z.string().max(255).optional().nullable(),
  uniqueSellingPoints: z.array(z.string().min(1)).optional().default([]),
  pricingInfo: z.record(z.unknown()).optional().nullable(),
  offers: z.array(z.string().min(1)).optional().default([]),
  primaryCta: z.string().max(255).optional().nullable(),
  socialLinks: z.record(z.string()).optional().default({}),
  brandColors: BrandColorsSchema,
  typography: BrandTypographySchema,
  contentPillars: z.array(z.string().min(1)).optional().default([]),
  marketingRules: MarketingRulesSchema,
  competitorReferences: z.array(z.string().min(1)).optional().default([])
});

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;

export const UpdateBrandSchema = CreateBrandSchema.partial();
export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;

// Product / Service Schemas
export const CreateProductSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(150),
  description: z.string().trim().min(5, 'Product description is required').max(2000),
  category: z.string().max(100).optional().nullable(),
  price: z.coerce.number().min(0, 'Price cannot be negative').optional().nullable(),
  currency: z.string().max(10).optional().default('USD'),
  features: z.array(z.string().min(1)).optional().default([]),
  benefits: z.array(z.string().min(1)).optional().default([]),
  usps: z.array(z.string().min(1)).optional().default([]),
  targetAudience: z.string().max(1000).optional().nullable(),
  offerInfo: z.record(z.unknown()).optional().nullable(),
  cta: z.string().max(255).optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({})
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// Brand Asset Schemas
export const AssetPurposeSchema = z.enum([
  'HERO',
  'DETAIL',
  'LIFESTYLE',
  'PACKSHOT',
  'LOGO',
  'FEATURE'
]);

export const CreateBrandAssetSchema = z.object({
  type: z.enum(['logo', 'product_image', 'brand_image', 'document', 'LOGO', 'PRODUCT_IMAGE', 'IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER']).or(z.string()),
  name: z.string().trim().min(2, 'Asset name is required').max(255),
  storageKey: z.string().min(1, 'Storage key is required'),
  url: z.string().url('Invalid asset URL'),
  productId: z.string().optional().nullable(),
  assetPurpose: AssetPurposeSchema.or(z.string()).optional(),
  productionEligible: z.boolean().optional().default(true),
  isPlaceholder: z.boolean().optional().default(false),
  isTestAsset: z.boolean().optional().default(false),
  width: z.number().optional(),
  height: z.number().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.unknown()).optional().default({})
});

export type CreateBrandAssetInput = z.infer<typeof CreateBrandAssetSchema>;

export const AssignAssetToProductSchema = z.object({
  productId: z.string().nullable().optional(),
  assetPurpose: AssetPurposeSchema.or(z.string()).optional().default('HERO'),
  productionEligible: z.boolean().optional().default(true)
});

export type AssignAssetToProductInput = z.infer<typeof AssignAssetToProductSchema>;

// Brand DNA Structured AI Output Schema
export const BrandDNASchema = z.object({
  identity: z.object({
    brandName: z.string().min(1),
    industry: z.string().min(1),
    story: z.string().min(1),
    mission: z.string().min(1),
    personality: z.array(z.string())
  }),
  audience: z.object({
    primaryAudience: z.string().min(1),
    demographics: z.array(z.string()),
    painPoints: z.array(z.string()),
    desires: z.array(z.string()),
    buyingMotivations: z.array(z.string())
  }),
  messaging: z.object({
    positioning: z.string().min(1),
    coreMessage: z.string().min(1),
    valueProposition: z.string().min(1),
    usps: z.array(z.string()),
    proofPoints: z.array(z.string()),
    tone: z.array(z.string()),
    forbiddenMessaging: z.array(z.string())
  }),
  products: z.array(
    z.object({
      name: z.string().min(1),
      category: z.string().optional(),
      benefits: z.array(z.string()),
      features: z.array(z.string()),
      price: z.number().optional(),
      usps: z.array(z.string()),
      targetAudience: z.string().optional(),
      offers: z.array(z.string()).optional(),
      cta: z.string().optional()
    })
  ),
  visualIdentity: z.object({
    logoUrl: z.string().optional(),
    colors: z.record(z.string()).default({}),
    typography: z.record(z.string()).default({}),
    visualStyle: z.string().min(1),
    imageStyle: z.string().min(1)
  }),
  contentStrategy: z.object({
    contentPillars: z.array(z.string()),
    preferredTopics: z.array(z.string()),
    educationalTopics: z.array(z.string()),
    promotionalTopics: z.array(z.string()),
    storytellingTopics: z.array(z.string())
  }),
  promotionRules: z.object({
    primaryCTA: z.string().min(1),
    offers: z.array(z.string()),
    claimsToAvoid: z.array(z.string()),
    complianceRules: z.array(z.string()),
    brandRestrictions: z.array(z.string())
  })
});

export type BrandDNAOutput = z.infer<typeof BrandDNASchema>;

export const UpdateBrandDNASchema = BrandDNASchema.partial();
export type UpdateBrandDNAInput = z.infer<typeof UpdateBrandDNASchema>;

// ==========================================
// Phase 3: Marketing Brain & Campaign Schemas
// ==========================================

export const MarketingObjectiveSchema = z.enum([
  'BRAND_AWARENESS',
  'PRODUCT_AWARENESS',
  'LEAD_GENERATION',
  'SALES',
  'PRODUCT_LAUNCH',
  'PROMOTION',
  'CUSTOMER_ACQUISITION',
  'ENGAGEMENT',
  'WEBSITE_TRAFFIC',
  'APP_DOWNLOADS',
  'COMMUNITY_GROWTH',
  'RETENTION'
]);

export const CampaignStatusSchema = z.enum([
  'DRAFT',
  'READY',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
]);

export const GenerateMarketingStrategySchema = z.object({
  objective: z.string().min(2, 'Marketing objective is required'),
  businessGoal: z.string().min(5, 'Business goal must be at least 5 characters').max(1000),
  marketingGoal: z.string().min(5, 'Marketing goal must be at least 5 characters').max(1000),
  campaignRequirements: z.string().max(2000).optional()
});

export type GenerateMarketingStrategyInput = z.infer<typeof GenerateMarketingStrategySchema>;

// Marketing Strategy Structured AI Output Schema
export const MarketingStrategySchema = z.object({
  objective: z.string().min(1),
  businessGoal: z.string().min(1),
  marketingGoal: z.string().min(1),
  targetAudience: z.object({
    primarySegments: z.array(z.string()).min(1),
    psychographics: z.array(z.string()),
    buyingTriggers: z.array(z.string()),
    objectionsToOvercome: z.array(z.string())
  }),
  positioning: z.object({
    marketCategory: z.string().min(1),
    competitiveMoat: z.string().min(1),
    valuePropositionStatement: z.string().min(1),
    differentiators: z.array(z.string())
  }),
  messagingStrategy: z.object({
    brandNarrativeHook: z.string().min(1),
    keyThemes: z.array(z.string()).min(1),
    primaryAngles: z.array(z.string()).min(1),
    voiceGuidance: z.string().min(1)
  }),
  contentStrategy: z.object({
    pillars: z.array(
      z.object({
        name: z.string().min(1),
        purpose: z.string().min(1),
        audienceNeed: z.string().min(1),
        messagingAngle: z.string().min(1),
        recommendedFormats: z.array(z.string())
      })
    ),
    contentMix: z.array(
      z.object({
        type: z.string().min(1),
        percentage: z.number().min(0).max(100),
        purpose: z.string().min(1),
        funnelStage: z.string().min(1)
      })
    ),
    educationalThemes: z.array(z.string()),
    promotionalThemes: z.array(z.string()),
    storytellingThemes: z.array(z.string()),
    socialProofThemes: z.array(z.string()),
    engagementThemes: z.array(z.string())
  }),
  funnelStrategy: z.object({
    stages: z.array(
      z.object({
        stage: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION']),
        audienceState: z.string().min(1),
        objective: z.string().min(1),
        messageFocus: z.string().min(1),
        contentRole: z.string().min(1),
        ctaBehavior: z.string().min(1)
      })
    )
  }),
  channelStrategy: z.object({
    recommendedChannels: z.array(z.string()),
    channelGuidance: z.array(
      z.object({
        channel: z.string().min(1),
        role: z.string().min(1),
        contentApproach: z.string().min(1),
        formatGuidance: z.string().min(1),
        ctaStrategy: z.string().min(1)
      })
    )
  }),
  offerStrategy: z.object({
    recommendedOffers: z.array(z.string()),
    urgencyMechanisms: z.array(z.string()),
    riskReversals: z.array(z.string())
  }),
  kpiStrategy: z.object({
    primaryKPIs: z.array(z.string()).min(1),
    secondaryKPIs: z.array(z.string()),
    awarenessKPIs: z.array(z.string()),
    considerationKPIs: z.array(z.string()),
    conversionKPIs: z.array(z.string())
  }),
  risksAndGuardrails: z.object({
    claimsToAvoid: z.array(z.string()),
    restrictedTopics: z.array(z.string()),
    brandRestrictions: z.array(z.string()),
    toneRestrictions: z.array(z.string()),
    complianceNotes: z.array(z.string())
  })
});

export type MarketingStrategyOutput = z.infer<typeof MarketingStrategySchema>;

export const UpdateMarketingStrategySchema = MarketingStrategySchema.partial();
export type UpdateMarketingStrategyInput = z.infer<typeof UpdateMarketingStrategySchema>;

// Campaign Schemas
export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(2, 'Campaign name must be at least 2 characters').max(150),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  objective: z.string().min(2, 'Campaign objective is required'),
  status: CampaignStatusSchema.optional().default('DRAFT'),
  startDate: z.string().datetime().or(z.date()).optional().nullable(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  targetAudience: z.record(z.unknown()).optional().default({}),
  coreMessage: z.string().max(1000).optional().nullable(),
  offer: z.string().max(1000).optional().nullable(),
  primaryCta: z.string().max(255).optional().nullable(),
  contentPillars: z.array(z.string().min(1)).optional().default([]),
  channels: z.array(z.string().min(1)).optional().default([]),
  kpis: z.record(z.unknown()).optional().default({}),
  guardrails: z.record(z.unknown()).optional().default({})
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = CreateCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;

export const GenerateCampaignStrategySchema = z.object({
  campaignGoal: z.string().max(1000).optional(),
  additionalRequirements: z.string().max(2000).optional()
});

export type GenerateCampaignStrategyInput = z.infer<typeof GenerateCampaignStrategySchema>;

// Campaign Strategy Structured AI Output Schema
export const CampaignStrategySchema = z.object({
  objective: z.string().min(1),
  audience: z.object({
    primary: z.string().min(1),
    secondary: z.string().optional(),
    painPoints: z.array(z.string()),
    desires: z.array(z.string()),
    motivations: z.array(z.string())
  }),
  positioning: z.string().min(1),
  corePromise: z.string().min(1),
  keyMessages: z.array(z.string()).min(1),
  messagingAngles: z.array(z.string()).min(1),
  contentPillars: z.array(z.string()).min(1),
  contentMix: z.array(
    z.object({
      type: z.string().min(1),
      percentage: z.number().min(0).max(100),
      purpose: z.string().min(1),
      funnelStage: z.string().min(1)
    })
  ),
  funnel: z.object({
    awareness: z.object({ message: z.string(), formatGuidance: z.string(), cta: z.string() }),
    consideration: z.object({ message: z.string(), formatGuidance: z.string(), cta: z.string() }),
    conversion: z.object({ message: z.string(), formatGuidance: z.string(), cta: z.string() })
  }),
  offerStrategy: z.string().min(1),
  ctaStrategy: z.string().min(1),
  channelStrategy: z.array(
    z.object({
      channel: z.string().min(1),
      role: z.string().min(1),
      contentApproach: z.string().min(1),
      formatGuidance: z.string().min(1),
      ctaStrategy: z.string().min(1)
    })
  ),
  kpis: z.object({
    primary: z.array(z.string()),
    targets: z.array(z.string())
  }),
  guardrails: z.object({
    claimsToAvoid: z.array(z.string()),
    restrictions: z.array(z.string())
  })
});

export type CampaignStrategyOutput = z.infer<typeof CampaignStrategySchema>;

// ==========================================
// Phase 4: 30-Day Content Planner Schemas
// ==========================================

export const ContentTypeSchema = z.enum([
  'EDUCATIONAL',
  'PROMOTIONAL',
  'STORYTELLING',
  'SOCIAL_PROOF',
  'ENGAGEMENT',
  'AUTHORITY',
  'BEHIND_THE_SCENES',
  'PROBLEM_AGITATION'
]);

export const ContentFormatSchema = z.enum([
  'SHORT_REEL',
  'TALKING_HEAD_REEL',
  'PRODUCT_SHOWCASE_REEL',
  'TUTORIAL_REEL',
  'TESTIMONIAL_REEL',
  'TREND_REEL',
  'CAROUSEL_CONCEPT',
  'IMAGE_POST',
  'STORY_SEQUENCE'
]);

export const ContentPlatformSchema = z.enum([
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE_SHORTS',
  'FACEBOOK',
  'LINKEDIN',
  'TWITTER'
]);

export const ContentPlanStatusSchema = z.enum([
  'DRAFT',
  'GENERATING',
  'READY',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED'
]);

export const ContentJobStatusSchema = z.enum([
  'PLANNED',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
  'CANCELLED'
]);

export const ContentJobPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH'
]);

export const CreateContentPlanSchema = z.object({
  name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(150),
  objective: z.string().trim().min(2, 'Objective must be at least 2 characters').max(255),
  campaignId: z.string().uuid('Invalid campaign ID').optional().nullable(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  durationDays: z.coerce.number().int().min(1).max(90).default(30),
  strategySnapshot: z.record(z.unknown()).optional().default({})
});

export type CreateContentPlanInput = z.infer<typeof CreateContentPlanSchema>;

export const UpdateContentPlanSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  objective: z.string().trim().min(2).max(255).optional(),
  status: ContentPlanStatusSchema.optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  strategySnapshot: z.record(z.unknown()).optional()
});

export type UpdateContentPlanInput = z.infer<typeof UpdateContentPlanSchema>;

export const GenerateContentPlanSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID').optional().nullable(),
  name: z.string().trim().min(2).max(150).optional(),
  objective: z.string().trim().min(2).max(255).optional(),
  durationDays: z.coerce.number().int().min(7).max(60).default(30),
  startDate: z.string().datetime().or(z.date()).optional().nullable(),
  platforms: z.array(ContentPlatformSchema).min(1).default(['INSTAGRAM', 'TIKTOK', 'YOUTUBE_SHORTS']),
  customGuidance: z.string().max(2000).optional().nullable(),
  regenerate: z.boolean().optional().default(false),
  preserveApprovedJobs: z.boolean().optional().default(true)
});

export type GenerateContentPlanInput = z.infer<typeof GenerateContentPlanSchema>;

export const UpdateContentJobSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(255).optional(),
  dayNumber: z.coerce.number().int().min(1).max(90).optional(),
  contentType: ContentTypeSchema.optional(),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION']).optional(),
  contentPillar: z.string().trim().min(2).max(255).optional(),
  objective: z.string().trim().min(2).max(500).optional(),
  audience: z.string().trim().min(2).max(500).optional(),
  topic: z.string().trim().min(2).max(500).optional(),
  hook: z.string().trim().min(2).max(1000).optional(),
  keyMessage: z.string().trim().min(2).max(1000).optional(),
  messagingAngle: z.string().trim().min(2).max(500).optional(),
  offer: z.string().trim().max(500).optional().nullable(),
  cta: z.string().trim().max(500).optional(),
  platform: ContentPlatformSchema.optional(),
  format: ContentFormatSchema.optional(),
  priority: ContentJobPrioritySchema.optional(),
  status: ContentJobStatusSchema.optional(),
  scheduledDate: z.string().datetime().or(z.date()).optional(),
  strategy: z.record(z.unknown()).optional()
});

export type UpdateContentJobInput = z.infer<typeof UpdateContentJobSchema>;

export const UpdateContentJobStatusSchema = z.object({
  status: ContentJobStatusSchema
});

export type UpdateContentJobStatusInput = z.infer<typeof UpdateContentJobStatusSchema>;

// AI Structured Output Schemas for Content Planner
export const ContentJobOutputSchema = z.object({
  dayNumber: z.number().int().min(1).max(90),
  weekNumber: z.number().int().min(1).max(15).optional().default(1),
  title: z.string().min(1),
  contentType: ContentTypeSchema,
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION']),
  contentPillar: z.string().min(1),
  objective: z.string().min(1),
  audience: z.string().min(1),
  topic: z.string().min(1),
  hook: z.string().min(1),
  keyMessage: z.string().min(1),
  messagingAngle: z.string().min(1),
  offer: z.string().optional().nullable(),
  cta: z.string().min(1),
  platform: ContentPlatformSchema.default('INSTAGRAM'),
  format: ContentFormatSchema.default('SHORT_REEL'),
  priority: ContentJobPrioritySchema.default('MEDIUM'),
  suggestedVisualHook: z.string().optional(),
  suggestedAudioConcept: z.string().optional(),
  keyTakeaway: z.string().optional(),
  strategicRationale: z.string().optional()
});

export type ContentJobOutput = z.infer<typeof ContentJobOutputSchema>;

export const ContentPlanOutputSchema = z.object({
  planName: z.string().min(1),
  objective: z.string().min(1),
  durationDays: z.number().int().min(1),
  campaignTheme: z.string().min(1),
  executiveSummary: z.string().min(1),
  weeklyNarratives: z.array(
    z.object({
      weekNumber: z.number().int().min(1),
      theme: z.string().min(1),
      focusObjective: z.string().min(1),
      funnelFocus: z.string().min(1),
      strategicPurpose: z.string().min(1)
    })
  ),
  diversificationSummary: z.object({
    funnelDistribution: z.record(z.number()),
    contentTypeDistribution: z.record(z.number()),
    formatDistribution: z.record(z.number()),
    pillarDistribution: z.record(z.number())
  }),
  jobs: z.array(ContentJobOutputSchema).min(7)
});

export type ContentPlanOutput = z.infer<typeof ContentPlanOutputSchema>;

// ==========================================
// Phase 5: Autonomous Reel Orchestrator Schemas
// ==========================================

export const ReelStatusSchema = z.enum([
  'DRAFT',
  'GENERATING',
  'READY',
  'NEEDS_REVIEW',
  'APPROVED',
  'IN_PRODUCTION',
  'COMPLETED',
  'FAILED',
  'ARCHIVED'
]);

export const HookTypeSchema = z.enum([
  'QUESTION',
  'PROBLEM',
  'CURIOSITY',
  'CONTRAST',
  'STATEMENT',
  'STORY',
  'DEMONSTRATION',
  'BENEFIT',
  'MISTAKE',
  'CHALLENGE'
]);

export const SceneVisualTypeSchema = z.enum([
  'PRODUCT_SHOWCASE',
  'PRODUCT_HERO',
  'PROBLEM',
  'SOLUTION',
  'DEMONSTRATION',
  'FEATURE_CALLOUT',
  'BENEFIT',
  'TRANSFORMATION',
  'BRAND_IDENTITY',
  'LIFESTYLE',
  'STORY',
  'EDUCATION',
  'COMPARISON',
  'TESTIMONIAL',
  'SOCIAL_PROOF',
  'CTA',
  'BRAND',
  'ABSTRACT',
  'TEXT_FOCUS'
]).or(z.string());

export const CtaTypeSchema = z.enum([
  'LEARN_MORE',
  'VISIT_WEBSITE',
  'SHOP_NOW',
  'TRY_NOW',
  'SIGN_UP',
  'DOWNLOAD',
  'FOLLOW',
  'COMMENT',
  'SAVE',
  'SHARE',
  'MESSAGE',
  'CUSTOM'
]);

export const ReelConceptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  concept: z.string().min(1, 'Concept is required'),
  objective: z.string().min(1, 'Objective is required'),
  targetAudience: z.string().min(1, 'Target audience is required'),
  corePromise: z.string().min(1, 'Core promise is required'),
  emotionalAngle: z.string().min(1, 'Emotional angle is required'),
  messagingAngle: z.string().min(1, 'Messaging angle is required'),
  contentPillar: z.string().min(1, 'Content pillar is required'),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION'])
});

export const HookSchema = z.object({
  type: HookTypeSchema,
  text: z.string().min(1, 'Hook text is required'),
  visualIntent: z.string().min(1, 'Visual intent is required'),
  deliveryStyle: z.string().min(1, 'Delivery style is required'),
  durationSeconds: z.number().min(1).max(10).default(3)
});

export const ScriptSegmentSchema = z.object({
  id: z.string().min(1),
  purpose: z.string().min(1),
  text: z.string().min(1),
  estimatedDuration: z.number().min(0.5),
  deliveryStyle: z.string().min(1),
  emotionalTone: z.string().min(1)
});

export const ReelSceneSchema = z.object({
  sceneNumber: z.number().int().min(1),
  durationSeconds: z.number().min(0.5).max(30),
  purpose: z.string().min(1, 'Scene purpose is required'),
  narration: z.string().default(''),
  onScreenText: z.string().default(''),
  visualType: SceneVisualTypeSchema,
  subject: z.string().default(''),
  environment: z.string().default(''),
  composition: z.string().default(''),
  camera: z.string().default(''),
  lighting: z.string().default(''),
  mood: z.string().default(''),
  transition: z.string().default('cut'),
  animationIntent: z.string().default(''),
  assetRequirement: z.string().min(1, 'Asset requirement is required'),
  productReference: z.string().optional().nullable(),
  brandElement: z.string().optional().nullable(),
  emphasis: z.string().optional().nullable(),
  veoPrompt: z.string().optional(),
  veoNegativePrompt: z.string().optional(),
  cameraMovement: z.string().optional(),
  motion: z.string().optional(),
  productPreservationRules: z.string().optional(),
  brandPreservationRules: z.string().optional(),
  textSafeComposition: z.boolean().or(z.string()).optional(),
  transitionIntention: z.string().optional(),
  referenceAssetIds: z.array(z.string()).optional(),
  firstFrameAssetId: z.string().optional().nullable(),
  lastFrameAssetId: z.string().optional().nullable(),
  veoModel: z.string().optional(),
  veoOperationId: z.string().optional().nullable(),
  veoGenerationStatus: z.string().optional().nullable(),
  failureReason: z.string().optional().nullable()
});

export const VisualDirectionSchema = z.object({
  style: z.string().default('cinematic modern'),
  mood: z.string().default('energetic'),
  colorIntent: z.string().default('brand-aligned'),
  lightingIntent: z.string().default('bright clean'),
  composition: z.string().default('vertical centered'),
  cameraLanguage: z.string().default('dynamic cuts and smooth motion'),
  pacing: z.string().default('fast-paced'),
  visualHierarchy: z.string().default('subject first, text overlay clear'),
  brandIntegration: z.string().default('subtle logo placement in key moments'),
  productEmphasis: z.string().default('hero product visibility')
});

export const VoiceDirectionSchema = z.object({
  style: z.string().default('confident'),
  pace: z.string().default('energetic'),
  tone: z.string().default('friendly and inspiring'),
  genderPreference: z.string().optional(),
  language: z.string().optional().default('en-US'),
  accents: z.string().optional()
});

export const CaptionDirectionSchema = z.object({
  style: z.string().default('bold dynamic kinetic captions'),
  placement: z.string().default('bottom-third center'),
  density: z.string().default('1-3 words per burst'),
  fontEmphasis: z.string().default('high-contrast brand typography'),
  animation: z.string().default('pop in with subtle scale')
});

export const AnimationDirectionSchema = z.object({
  energy: z.string().default('high'),
  style: z.string().default('smooth kinetic'),
  textAnimation: z.string().default('word-by-word highlight'),
  visualTransitions: z.string().default('whip pan, zoom, smooth cuts'),
  elementMotion: z.string().default('subtle drift and floating stickers')
});

export const AudioDirectionSchema = z.object({
  musicMood: z.string().default('upbeat electronic lo-fi'),
  soundEffects: z.string().default('subtle whooshes, click on text triggers'),
  pacing: z.string().default('synced with visual transitions'),
  mixBalance: z.string().default('voice 100%, background music 25%, SFX 40%')
});

export const ReelCtaSchema = z.object({
  type: CtaTypeSchema,
  text: z.string().min(1, 'CTA text is required'),
  visualTreatment: z.string().default('bold high-contrast button card'),
  placement: z.string().default('final scene endcard'),
  url: z.string().optional().nullable()
});

export const ProductionMetadataSchema = z.object({
  totalScenes: z.number().int().min(1),
  estimatedWordCount: z.number().int().min(0),
  targetDurationSeconds: z.number().min(5),
  calculatedDurationSeconds: z.number().min(5),
  generatedBy: z.string().default('VidSnapAI Reel Orchestrator v5.0'),
  brandDnaVersion: z.number().optional(),
  marketingStrategyId: z.string().optional(),
  campaignId: z.string().optional(),
  contentJobId: z.string(),
  generatedAt: z.string(),
  complianceNotes: z.array(z.string()).optional().default([]),
  warningFlags: z.array(z.string()).optional().default([])
});

export const ReelProductionPlanSchema = z.object({
  id: z.string().uuid(),
  contentJobId: z.string().uuid(),
  brandId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  contentPlanId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  version: z.number().int().min(1),
  title: z.string().min(1),
  concept: ReelConceptSchema,
  objective: z.string().min(1),
  audience: z.string().min(1),
  funnelStage: z.string().min(1),
  contentPillar: z.string().min(1),
  durationSeconds: z.number().min(5),
  aspectRatio: z.string().default('9:16'),
  platform: z.string().default('INSTAGRAM'),
  format: z.string().default('REEL'),
  hook: HookSchema,
  narrative: z.string().min(1),
  script: z.array(ScriptSegmentSchema).min(1),
  scenes: z.array(ReelSceneSchema).min(1),
  visualDirection: VisualDirectionSchema,
  voiceDirection: VoiceDirectionSchema,
  captionDirection: CaptionDirectionSchema,
  animationDirection: AnimationDirectionSchema,
  audioDirection: AudioDirectionSchema,
  cta: ReelCtaSchema,
  productionMetadata: ProductionMetadataSchema,
  status: ReelStatusSchema,
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string())
});

export const GenerateReelPlanSchema = z.object({
  targetProductId: z.string().optional(),
  productId: z.string().optional(),
  durationSeconds: z.coerce.number().int().min(5).max(120).optional().default(30),
  aspectRatio: z.string().optional().default('9:16'),
  platform: z.string().optional().default('INSTAGRAM'),
  format: z.string().optional().default('REEL'),
  customGuidance: z.string().max(2000).optional(),
  voiceStyleOverride: z.string().max(200).optional(),
  toneOverride: z.string().max(200).optional()
});

export const RegenerateReelPlanSchema = GenerateReelPlanSchema.extend({
  regenerateReason: z.string().max(500).optional()
});

export const UpdateReelPlanSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  concept: ReelConceptSchema.partial().optional(),
  targetProductId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  targetProduct: z.string().optional().nullable(),
  objective: z.string().trim().min(1).max(500).optional(),
  audience: z.string().trim().min(1).max(500).optional(),
  funnelStage: z.string().optional(),
  contentPillar: z.string().optional(),
  durationSeconds: z.coerce.number().int().min(5).max(120).optional(),
  aspectRatio: z.string().optional(),
  platform: z.string().optional(),
  format: z.string().optional(),
  hook: HookSchema.partial().optional(),
  narrative: z.string().optional(),
  script: z.array(ScriptSegmentSchema).optional(),
  scenes: z.array(ReelSceneSchema).optional(),
  visualDirection: VisualDirectionSchema.partial().optional(),
  voiceDirection: VoiceDirectionSchema.partial().optional(),
  captionDirection: CaptionDirectionSchema.partial().optional(),
  animationDirection: AnimationDirectionSchema.partial().optional(),
  audioDirection: AudioDirectionSchema.partial().optional(),
  cta: ReelCtaSchema.partial().optional(),
  productionMetadata: ProductionMetadataSchema.partial().optional(),
  status: ReelStatusSchema.optional()
});

export const UpdateReelStatusSchema = z.object({
  status: ReelStatusSchema
});

export const RegenerateSceneSchema = z.object({
  sceneNumber: z.coerce.number().int().min(1),
  customGuidance: z.string().max(1000).optional()
});

export const BatchGenerateReelsSchema = z.object({
  jobIds: z.array(z.string().uuid()).optional(),
  customGuidance: z.string().max(2000).optional()
});

// AI Structured Output Schema for Gemini / AI Provider
export const ReelAIOutputSchema = z.object({
  title: z.string().min(1),
  concept: ReelConceptSchema,
  objective: z.string().min(1),
  audience: z.string().min(1),
  funnelStage: z.enum(['AWARENESS', 'CONSIDERATION', 'CONVERSION', 'RETENTION']),
  contentPillar: z.string().min(1),
  durationSeconds: z.number().min(5).max(120),
  aspectRatio: z.string().default('9:16'),
  platform: z.string().default('INSTAGRAM'),
  format: z.string().default('REEL'),
  hook: HookSchema,
  narrative: z.string().min(1),
  script: z.array(ScriptSegmentSchema).min(1),
  scenes: z.array(ReelSceneSchema).min(2),
  visualDirection: VisualDirectionSchema,
  voiceDirection: VoiceDirectionSchema,
  captionDirection: CaptionDirectionSchema,
  animationDirection: AnimationDirectionSchema,
  audioDirection: AudioDirectionSchema,
  cta: ReelCtaSchema
});

export type ReelAIOutput = z.infer<typeof ReelAIOutputSchema>;

// ====================================================
// Phase 6: Media + Voice + Captions + Audio Schemas
// ====================================================

// --- Reel Asset Schemas ---
export const ReelAssetTypeSchema = z.enum([
  'VIDEO',
  'IMAGE',
  'LOGO',
  'PRODUCT_IMAGE',
  'PRODUCT_VIDEO',
  'MUSIC',
  'SFX',
  'VOICE',
  'CAPTION'
]);

export const ReelAssetSourceTypeSchema = z.enum([
  'BRAND_LIBRARY',
  'PEXELS',
  'LOCAL_GALLERY',
  'GENERATED',
  'EXTERNAL'
]);

export const ReelAssetStatusSchema = z.enum([
  'DISCOVERED',
  'SELECTED',
  'DOWNLOADING',
  'READY',
  'FAILED',
  'REJECTED'
]);

export const ReelAssetSchema = z.object({
  id: z.string().uuid(),
  reelPlanId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid(),
  sceneNumber: z.number().int().nullable().optional(),
  assetType: ReelAssetTypeSchema,
  sourceType: ReelAssetSourceTypeSchema,
  provider: z.string().min(1),
  providerAssetId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  storageKey: z.string().nullable().optional(),
  filename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  isPlaceholder: z.boolean().optional(),
  isTestAsset: z.boolean().optional(),
  productId: z.string().nullable().optional(),
  assetPurpose: z.string().optional(),
  productionEligible: z.boolean().optional(),
  metadata: z.record(z.unknown()).default({}),
  licenseMetadata: z.record(z.unknown()).default({}),
  status: ReelAssetStatusSchema.default('READY'),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime())
});

export type ReelAsset = z.infer<typeof ReelAssetSchema>;

// --- Media Search & Requirements ---
export const MediaSearchQuerySchema = z.object({
  query: z.string().min(1).max(300),
  perPage: z.number().int().min(1).max(50).optional().default(15),
  page: z.number().int().min(1).optional().default(1),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional().default('portrait'),
  minWidth: z.number().int().optional(),
  minHeight: z.number().int().optional()
});

export const MediaAssetSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  type: z.enum(['video', 'image']),
  title: z.string().optional(),
  url: z.string().min(1),
  previewUrl: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  durationSeconds: z.number().optional(),
  photographer: z.string().optional(),
  photographerUrl: z.string().optional(),
  isPlaceholder: z.boolean().optional(),
  isTestAsset: z.boolean().optional(),
  productId: z.string().nullable().optional(),
  assetPurpose: z.string().optional(),
  productionEligible: z.boolean().optional()
});

export const MediaRequirementSchema = z.object({
  sceneNumber: z.number().int().min(1),
  purpose: z.string().min(1),
  assetRequirement: z.string().min(1),
  productReference: z.string().nullable().optional(),
  brandElement: z.string().nullable().optional(),
  visualType: z.string().min(1),
  mood: z.string().min(1),
  subject: z.string().min(1),
  environment: z.string().min(1),
  durationSeconds: z.number().positive()
});

// --- Voice Schemas ---
export const VoiceOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  gender: z.enum(['male', 'female', 'neutral']),
  accent: z.string().optional(),
  language: z.string().optional(),
  previewAudioUrl: z.string().optional(),
  provider: z.string().optional()
});

export const VoiceConfigurationSchema = z.object({
  voiceId: z.string().min(1),
  voiceName: z.string().optional(),
  provider: z.string().min(1).default('mock_voice'),
  style: z.string().optional(),
  tone: z.string().optional(),
  pace: z.string().optional(),
  energy: z.string().optional(),
  language: z.string().optional().default('en-US'),
  pronunciationHints: z.record(z.string()).optional(),
  pitch: z.number().optional(),
  speed: z.number().optional()
});

export type VoiceConfiguration = z.infer<typeof VoiceConfigurationSchema>;

// --- Caption Engine Schemas ---
export const CaptionStyleSchema = z.enum([
  'STANDARD',
  'WORD_HIGHLIGHT',
  'KARAOKE',
  'EMPHASIS',
  'MINIMAL',
  'CTA'
]);

export const CaptionCueSchema = z.object({
  id: z.string().min(1),
  startTime: z.number().min(0),
  endTime: z.number().positive(),
  text: z.string().min(1),
  style: CaptionStyleSchema.optional().default('STANDARD'),
  emphasis: z.string().nullable().optional(),
  sceneNumber: z.number().int().nullable().optional()
});

export const CaptionStyleConfigSchema = z.object({
  fontFamily: z.string().optional().default('Outfit'),
  fontSize: z.number().positive().optional().default(32),
  primaryColor: z.string().optional().default('#FFFFFF'),
  highlightColor: z.string().optional().default('#6366F1'),
  animationStyle: z.enum(['fade', 'pop', 'typewriter', 'karaoke', 'kinetic']).optional().default('kinetic'),
  position: z.enum(['bottom', 'center', 'top']).optional().default('bottom'),
  maxWordsPerLine: z.number().int().min(1).max(10).optional().default(4)
});

export const CaptionTrackSchema = z.object({
  id: z.string().uuid(),
  reelPlanId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid(),
  version: z.number().int().default(1),
  cues: z.array(CaptionCueSchema),
  style: CaptionStyleConfigSchema,
  status: z.string().default('READY'),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime())
});

export type CaptionTrack = z.infer<typeof CaptionTrackSchema>;

// --- Audio, Music & SFX Schemas ---
export const AudioSourceOptionSchema = z.enum([
  'AI_RECOMMENDED',
  'BRAND_LIBRARY',
  'LOCAL_GALLERY'
]);

export const MusicSelectionSchema = z.object({
  source: AudioSourceOptionSchema.default('AI_RECOMMENDED'),
  assetId: z.string().optional(),
  title: z.string().optional(),
  artist: z.string().optional(),
  url: z.string().optional(),
  storageKey: z.string().optional(),
  mood: z.string().optional(),
  genre: z.string().optional(),
  tempoBpm: z.number().optional(),
  durationSeconds: z.number().optional(),
  volume: z.number().min(0).max(1).default(0.3),
  licenseMetadata: z.record(z.unknown()).optional()
});

export const SFXSelectionSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  source: AudioSourceOptionSchema.default('AI_RECOMMENDED'),
  url: z.string().optional(),
  storageKey: z.string().optional(),
  startTime: z.number().min(0),
  durationSeconds: z.number().positive(),
  volume: z.number().min(0).max(1).default(0.4),
  sceneNumber: z.number().int().optional()
});

export const AudioMixSettingsSchema = z.object({
  voiceVolume: z.number().min(0).max(1).default(1.0),
  musicVolume: z.number().min(0).max(1).default(0.3),
  sfxVolume: z.number().min(0).max(1).default(0.4),
  ducking: z.boolean().default(true),
  duckingLevel: z.number().min(0).max(1).default(0.2),
  fadeInSeconds: z.number().min(0).default(0.5),
  fadeOutSeconds: z.number().min(0).default(1.0),
  priorityOrder: z.array(z.string()).default(['VOICE', 'SFX', 'MUSIC'])
});

export const AudioMixPlanSchema = z.object({
  id: z.string().uuid(),
  reelPlanId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid(),
  voiceConfig: VoiceConfigurationSchema,
  musicConfig: MusicSelectionSchema,
  sfxConfigs: z.array(SFXSelectionSchema).default([]),
  mixSettings: AudioMixSettingsSchema,
  status: z.string().default('READY'),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime())
});

export type AudioMixPlan = z.infer<typeof AudioMixPlanSchema>;

// --- Production Readiness & Package Schemas ---
export const ReadinessBlockerCodeSchema = z.enum([
  'MEDIA_MISSING',
  'VOICE_MISSING',
  'CAPTIONS_MISSING',
  'AUDIO_MISSING',
  'BRAND_ASSET_MISSING',
  'STORAGE_ERROR',
  'PROVIDER_ERROR'
]);

export const ProductionComponentCheckSchema = z.object({
  status: z.enum(['READY', 'MISSING', 'OPTIONAL', 'FAILED']),
  details: z.string().optional(),
  assetCount: z.number().int().optional()
});

export const ProductionReadinessSchema = z.object({
  status: z.enum(['READY_FOR_ANIMATION', 'BLOCKED', 'IN_PROGRESS']),
  checks: z.object({
    media: ProductionComponentCheckSchema,
    voice: ProductionComponentCheckSchema,
    captions: ProductionComponentCheckSchema,
    music: ProductionComponentCheckSchema,
    sfx: ProductionComponentCheckSchema,
    brandAssets: ProductionComponentCheckSchema
  }),
  blockers: z.array(ReadinessBlockerCodeSchema),
  evaluatedAt: z.string()
});

export const ReelProductionPackageSchema = z.object({
  id: z.string().uuid(),
  reelPlanId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid(),
  readiness: ProductionReadinessSchema,
  packagePayload: z.object({
    reelPlan: z.record(z.unknown()),
    assets: z.array(ReelAssetSchema),
    voiceAsset: ReelAssetSchema.nullable().optional(),
    captionTrack: CaptionTrackSchema.nullable().optional(),
    audioMixPlan: AudioMixPlanSchema.nullable().optional()
  }),
  status: z.string().default('READY'),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime())
});

export type ReelProductionPackage = z.infer<typeof ReelProductionPackageSchema>;

// --- API Request Input Schemas ---
export const ResolveMediaInputSchema = z.object({
  preferFirstPartyOnly: z.boolean().optional().default(false),
  refreshExisting: z.boolean().optional().default(false)
});

export const ResolveSceneMediaInputSchema = z.object({
  sourcePreference: ReelAssetSourceTypeSchema.optional(),
  customSearchQuery: z.string().max(300).optional(),
  selectedAssetId: z.string().optional()
});

export const GenerateVoiceInputSchema = z.object({
  voiceConfig: VoiceConfigurationSchema.optional(),
  customNarrationText: z.string().max(5000).optional()
});

export const GenerateCaptionsInputSchema = z.object({
  style: CaptionStyleConfigSchema.optional(),
  preferredStyle: CaptionStyleSchema.optional()
});

export const UpdateCaptionTrackSchema = z.object({
  cues: z.array(CaptionCueSchema).min(1),
  style: CaptionStyleConfigSchema.optional()
});

export const ResolveAudioInputSchema = z.object({
  musicSelection: MusicSelectionSchema.optional(),
  sfxSelections: z.array(SFXSelectionSchema).optional(),
  mixSettings: AudioMixSettingsSchema.optional()
});

export const UpdateReelAssetSchema = z.object({
  status: ReelAssetStatusSchema.optional(),
  sceneNumber: z.number().int().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});

// ====================================================
// Phase 7: Advanced Animation Intelligence Schemas
// ====================================================

export const AnimationLanguageSchema = z.enum([
  'CINEMATIC',
  'PREMIUM',
  'ENERGETIC',
  'MINIMAL',
  'CORPORATE',
  'LUXURY',
  'PLAYFUL',
  'TECH',
  'DRAMATIC',
  'EDITORIAL',
  'SOCIAL_FAST',
  'PRODUCT_FOCUSED'
]);

export const AnimationStatusSchema = z.enum([
  'DRAFT',
  'GENERATING',
  'READY',
  'NEEDS_REVIEW',
  'APPROVED',
  'FAILED',
  'SUPERSEDED'
]);

export const AnimationIntensitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']);

export const AnimationTargetSchema = z.enum([
  'BACKGROUND',
  'MEDIA',
  'PRODUCT',
  'LOGO',
  'TEXT',
  'CAPTION',
  'CTA',
  'OVERLAY',
  'ICON',
  'SHAPE',
  'SCENE'
]);

export const AnimationEventTypeSchema = z.enum([
  'FADE_IN',
  'FADE_OUT',
  'SLIDE_IN',
  'SLIDE_OUT',
  'SCALE_IN',
  'SCALE_OUT',
  'ZOOM_IN',
  'ZOOM_OUT',
  'PAN',
  'PARALLAX',
  'ROTATE',
  'BLUR_IN',
  'BLUR_OUT',
  'MASK_REVEAL',
  'WIPE',
  'GLITCH',
  'SHAKE',
  'BOUNCE',
  'SPRING',
  'POP',
  'GLOW',
  'HIGHLIGHT',
  'STAGGER',
  'TYPE_ON',
  'WORD_POP',
  'CHARACTER_REVEAL',
  'IMAGE_REVEAL',
  'PRODUCT_REVEAL',
  'LOGO_REVEAL',
  'CTA_PULSE'
]);

export const AnimationEasingSchema = z.enum([
  'LINEAR',
  'EASE_IN',
  'EASE_OUT',
  'EASE_IN_OUT',
  'CUBIC_IN',
  'CUBIC_OUT',
  'CUBIC_IN_OUT',
  'QUAD_IN',
  'QUAD_OUT',
  'BACK',
  'ELASTIC',
  'BOUNCE',
  'SPRING'
]);

export const CameraMotionTypeSchema = z.enum([
  'STATIC',
  'SLOW_PUSH',
  'SLOW_PULL',
  'DYNAMIC_PUSH',
  'DYNAMIC_PULL',
  'PAN_LEFT',
  'PAN_RIGHT',
  'PAN_UP',
  'PAN_DOWN',
  'PARALLAX',
  'ORBIT_INTENT',
  'WHIP_INTENT'
]);

export const ProductRevealTypeSchema = z.enum([
  'CLEAN_REVEAL',
  'SLIDE_REVEAL',
  'SCALE_REVEAL',
  'MASK_REVEAL',
  'LIGHT_REVEAL',
  'FOCUS_REVEAL',
  'HERO_REVEAL',
  'DETAIL_REVEAL'
]);

export const LogoAnimationStyleSchema = z.enum([
  'FADE',
  'REVEAL',
  'SLIDE',
  'SCALE',
  'MASK',
  'LIGHT_SWEEP',
  'MINIMAL_MARK'
]);

export const TextEntranceStyleSchema = z.enum([
  'WORD_POP',
  'WORD_HIGHLIGHT',
  'TYPE_ON',
  'SLIDE',
  'FADE',
  'SCALE',
  'STAGGER',
  'MASK_REVEAL',
  'EMPHASIS_PULSE'
]);

export const TransitionTypeSchema = z.enum([
  'CUT',
  'FADE',
  'CROSSFADE',
  'SLIDE',
  'WIPE',
  'ZOOM',
  'MATCH_MOVE',
  'LIGHT_WIPE',
  'BLUR',
  'GLITCH',
  'WHIP',
  'MORPH_INTENT'
]);

export const SyncSourceSchema = z.enum(['VOICE', 'MUSIC', 'SFX']);

export const SyncEventSchema = z.enum([
  'WORD_START',
  'WORD_EMPHASIS',
  'BEAT',
  'SFX_HIT',
  'CTA',
  'SCENE_START',
  'SCENE_END'
]);

export const AnimationModeSchema = z.enum([
  'SOCIAL_REEL',
  'BRAND_PROMOTION',
  'PRODUCT_PROMOTION',
  'EDUCATIONAL',
  'STORYTELLING',
  'ANNOUNCEMENT'
]);

export const GlobalAnimationSettingsSchema = z.object({
  animationLanguage: AnimationLanguageSchema.default('CINEMATIC'),
  intensity: AnimationIntensitySchema.default('MEDIUM'),
  pacing: z.string().default('dynamic rhythmic'),
  smoothness: z.number().min(0).max(1).default(0.85),
  defaultEasing: AnimationEasingSchema.default('CUBIC_OUT'),
  defaultTransition: TransitionTypeSchema.default('CROSSFADE'),
  motionBlurIntent: z.boolean().default(true),
  maxSimultaneousAnimations: z.number().int().min(1).max(10).default(4),
  reducedMotionSupport: z.boolean().default(false),
  mode: AnimationModeSchema.optional()
});

export const AnimationEventSchema = z.object({
  id: z.string().min(1),
  type: AnimationEventTypeSchema,
  target: AnimationTargetSchema,
  startTime: z.number().min(0),
  duration: z.number().positive(),
  easing: AnimationEasingSchema.default('CUBIC_OUT'),
  intensity: AnimationIntensitySchema.default('MEDIUM'),
  parameters: z.record(z.unknown()).default({}),
  trigger: z.string().optional(),
  layer: z.number().int().min(1).default(1),
  priority: z.number().int().min(1).max(10).default(5)
});

export const CameraMotionSchema = z.object({
  type: CameraMotionTypeSchema,
  startTime: z.number().min(0),
  duration: z.number().positive(),
  intensity: AnimationIntensitySchema.default('MEDIUM'),
  direction: z.enum(['IN', 'OUT', 'LEFT', 'RIGHT', 'UP', 'DOWN']).optional(),
  focalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  scale: z.number().optional(),
  easing: AnimationEasingSchema.default('CUBIC_OUT')
});

export const ProductAnimationSchema = z.object({
  productId: z.string().optional(),
  revealType: ProductRevealTypeSchema,
  startTime: z.number().min(0),
  duration: z.number().positive(),
  emphasis: z.boolean().default(true),
  isHeroMoment: z.boolean().optional().default(false),
  scaleIntent: z.number().optional(),
  positionIntent: z.string().optional(),
  highlightIntent: z.boolean().optional(),
  backgroundTreatment: z.string().optional()
});

export const LogoAnimationSchema = z.object({
  assetId: z.string().optional(),
  startTime: z.number().min(0),
  duration: z.number().positive(),
  style: LogoAnimationStyleSchema,
  scale: z.number().optional(),
  position: z.enum(['top-left', 'top-right', 'center', 'bottom-center', 'bottom-right']).optional(),
  opacity: z.number().min(0).max(1).optional(),
  easing: AnimationEasingSchema.default('CUBIC_OUT')
});

export const TextAnimationSchema = z.object({
  targetText: z.string(),
  startTime: z.number().min(0),
  duration: z.number().positive(),
  entrance: TextEntranceStyleSchema,
  emphasis: z.string().optional(),
  exit: z.string().optional(),
  easing: AnimationEasingSchema.default('CUBIC_OUT'),
  stagger: z.number().optional(),
  emphasisWords: z.array(z.string()).default([])
});

export const TransitionPlanSchema = z.object({
  fromScene: z.number().int().min(1),
  toScene: z.number().int().min(1),
  type: TransitionTypeSchema,
  duration: z.number().positive(),
  easing: AnimationEasingSchema.default('CUBIC_OUT'),
  intensity: AnimationIntensitySchema.default('MEDIUM'),
  rationale: z.string().optional()
});

export const SyncCueSchema = z.object({
  time: z.number().min(0),
  source: SyncSourceSchema,
  event: SyncEventSchema,
  target: AnimationTargetSchema,
  strength: z.number().min(0).max(1).default(0.8),
  label: z.string().optional()
});

export const SceneAnimationSchema = z.object({
  sceneNumber: z.number().int().min(1),
  startTime: z.number().min(0),
  endTime: z.number().positive(),
  animationIntensity: AnimationIntensitySchema.default('MEDIUM'),
  entranceAnimations: z.array(AnimationEventSchema).default([]),
  continuousAnimations: z.array(AnimationEventSchema).default([]),
  emphasisAnimations: z.array(AnimationEventSchema).default([]),
  exitAnimations: z.array(AnimationEventSchema).default([]),
  cameraMotion: z.array(CameraMotionSchema).default([]),
  textMotion: z.array(TextAnimationSchema).default([]),
  mediaMotion: z.array(AnimationEventSchema).default([]),
  productMotion: z.array(ProductAnimationSchema).default([]),
  logoMotion: z.array(LogoAnimationSchema).default([]),
  synchronizationCues: z.array(SyncCueSchema).default([]),
  transitionOut: TransitionPlanSchema.optional(),
  rationale: z.string().default('')
});

export const VisualRhythmPlanSchema = z.object({
  sceneIntensity: z.record(z.string(), AnimationIntensitySchema).default({}),
  motionDensity: z.record(z.string(), z.enum(['LOW', 'MEDIUM', 'HIGH'])).default({}),
  transitionDensity: z.string().default('balanced'),
  emphasisMoments: z.array(
    z.object({
      sceneNumber: z.number().int().min(1),
      timestamp: z.number().min(0),
      description: z.string(),
      target: AnimationTargetSchema
    })
  ).default([])
});

export const AnimationPlanMetadataSchema = z.object({
  generatedBy: z.string().default('VidSnapAI Animation Intelligence v7.0'),
  generatedAt: z.string(),
  fallbackUsed: z.boolean().optional().default(false),
  fallbackReason: z.string().optional(),
  brandDnaVersion: z.number().optional(),
  campaignMode: AnimationModeSchema.optional(),
  targetDurationSeconds: z.number().optional(),
  totalEventsCount: z.number().optional(),
  rhythm: VisualRhythmPlanSchema.optional(),
  sceneCount: z.number().optional()
});

export const AnimationPlanSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  brandId: z.string().uuid(),
  reelPlanId: z.string().uuid(),
  productionPackageId: z.string().uuid(),
  version: z.number().int().default(1),
  status: AnimationStatusSchema.default('READY'),
  animationLanguage: AnimationLanguageSchema,
  globalSettings: GlobalAnimationSettingsSchema,
  sceneAnimations: z.array(SceneAnimationSchema),
  transitionPlan: z.array(TransitionPlanSchema),
  textAnimationPlan: z.array(TextAnimationSchema),
  cameraPlan: z.array(CameraMotionSchema),
  productAnimationPlan: z.array(ProductAnimationSchema),
  logoAnimationPlan: z.array(LogoAnimationSchema),
  syncPlan: z.array(SyncCueSchema),
  metadata: AnimationPlanMetadataSchema,
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime())
});

export type AnimationPlan = z.infer<typeof AnimationPlanSchema>;

export const AnimationBlockerCodeSchema = z.enum([
  'MISSING_SCENE_ANIMATION',
  'INVALID_TIMING',
  'MISSING_MEDIA_REFERENCE',
  'MISSING_CAPTION_REFERENCE',
  'MISSING_AUDIO_SYNC',
  'INVALID_TRANSITION',
  'ANIMATION_CONFLICT'
]);

export const AnimationReadinessReportSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(['READY', 'NEEDS_REVIEW', 'NOT_READY']),
  blockers: z.array(AnimationBlockerCodeSchema),
  warnings: z.array(z.string()),
  sceneCoverage: z.number().min(0).max(100),
  syncCoverage: z.number().min(0).max(100),
  assetCoverage: z.number().min(0).max(100),
  validationErrors: z.array(z.string()),
  evaluatedAt: z.string()
});

export const GenerateAnimationPlanInputSchema = z.object({
  animationLanguage: AnimationLanguageSchema.optional(),
  intensity: AnimationIntensitySchema.optional(),
  mode: AnimationModeSchema.optional(),
  reducedMotion: z.boolean().optional(),
  customGuidance: z.string().max(2000).optional()
});

export const RegenerateAnimationPlanInputSchema = GenerateAnimationPlanInputSchema.extend({
  regenerateReason: z.string().max(500).optional()
});

export const UpdateAnimationPlanSchema = z.object({
  status: AnimationStatusSchema.optional(),
  animationLanguage: AnimationLanguageSchema.optional(),
  globalSettings: GlobalAnimationSettingsSchema.partial().optional(),
  sceneAnimations: z.array(SceneAnimationSchema).optional(),
  transitionPlan: z.array(TransitionPlanSchema).optional(),
  textAnimationPlan: z.array(TextAnimationSchema).optional(),
  cameraPlan: z.array(CameraMotionSchema).optional(),
  productAnimationPlan: z.array(ProductAnimationSchema).optional(),
  logoAnimationPlan: z.array(LogoAnimationSchema).optional(),
  syncPlan: z.array(SyncCueSchema).optional(),
  metadata: AnimationPlanMetadataSchema.partial().optional()
});

export const UpdateAnimationStatusSchema = z.object({
  status: AnimationStatusSchema
});

export const RegenerateSceneAnimationInputSchema = z.object({
  sceneNumber: z.coerce.number().int().min(1),
  customGuidance: z.string().max(1000).optional(),
  intensity: AnimationIntensitySchema.optional()
});

// AI Structured Output Schema for Gemini / AI Provider
export const AnimationAIOutputSchema = z.object({
  animationLanguage: AnimationLanguageSchema,
  globalSettings: GlobalAnimationSettingsSchema,
  sceneAnimations: z.array(SceneAnimationSchema).min(1),
  transitionPlan: z.array(TransitionPlanSchema),
  textAnimationPlan: z.array(TextAnimationSchema),
  cameraPlan: z.array(CameraMotionSchema),
  productAnimationPlan: z.array(ProductAnimationSchema),
  logoAnimationPlan: z.array(LogoAnimationSchema),
  syncPlan: z.array(SyncCueSchema),
  visualRhythm: VisualRhythmPlanSchema.optional(),
  creativeRationale: z.string()
});

export type AnimationAIOutput = z.infer<typeof AnimationAIOutputSchema>;

// ==========================================
// Phase 10: Meta Ads Integration Schemas
// ==========================================

export const MetaSelectAccountSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required'),
  pageId: z.string().optional(),
  instagramActorId: z.string().optional()
});

export type MetaSelectAccountInput = z.infer<typeof MetaSelectAccountSchema>;

export const MetaAdObjectiveSchema = z.enum([
  'OUTCOME_TRAFFIC',
  'OUTCOME_LEADS',
  'OUTCOME_SALES',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_AWARENESS',
  'OUTCOME_APP_PROMOTION'
]);

export const MetaAdCallToActionTypeSchema = z.enum([
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'CONTACT_US',
  'WATCH_MORE',
  'ORDER_NOW',
  'GET_OFFER',
  'BOOK_TRAVEL',
  'APPLY_NOW'
]);

export const MetaTargetingSchema = z.object({
  geoLocations: z
    .object({
      countries: z.array(z.string().length(2)).optional().default(['US']),
      regions: z.array(z.object({ key: z.string(), name: z.string().optional() })).optional(),
      cities: z.array(z.object({ key: z.string(), name: z.string().optional() })).optional()
    })
    .optional()
    .default({ countries: ['US'] }),
  ageMin: z.number().int().min(18).max(65).optional().default(18),
  ageMax: z.number().int().min(18).max(65).optional().default(65),
  genders: z.array(z.number().int().min(1).max(2)).optional(),
  interests: z.array(z.object({ id: z.string(), name: z.string() })).optional().default([]),
  publisherPlatforms: z.array(z.enum(['facebook', 'instagram', 'audience_network', 'messenger'])).optional().default(['facebook', 'instagram']),
  facebookPositions: z.array(z.string()).optional().default(['feed', 'facebook_reels']),
  instagramPositions: z.array(z.string()).optional().default(['stream', 'story', 'reels']),
  devicePlatforms: z.array(z.enum(['mobile', 'desktop'])).optional().default(['mobile'])
}).optional().default({});

export type MetaTargetingInput = z.infer<typeof MetaTargetingSchema>;

export const CreateMetaCampaignSchema = z.object({
  name: z.string().min(2, 'Campaign name must be at least 2 characters').max(255),
  brandId: z.string().uuid('Valid brandId is required'),
  campaignId: z.string().uuid().optional().nullable(),
  metaAdAccountId: z.string().min(1, 'Meta Ad Account ID is required'),
  objective: MetaAdObjectiveSchema.default('OUTCOME_TRAFFIC'),
  buyingType: z.literal('AUCTION').default('AUCTION'),
  dailyBudget: z.number().int().positive('Daily budget must be positive (in cents)').optional(),
  lifetimeBudget: z.number().int().positive('Lifetime budget must be positive (in cents)').optional(),
  specialAdCategories: z.array(z.string()).optional().default([]),
  status: z.enum(['ACTIVE', 'PAUSED']).default('PAUSED')
});

export type CreateMetaCampaignInput = z.infer<typeof CreateMetaCampaignSchema>;

export const CreateMetaAdSetSchema = z.object({
  metaAdCampaignId: z.string().uuid('Valid Meta campaign ID is required'),
  name: z.string().min(2, 'Ad Set name must be at least 2 characters').max(255),
  billingEvent: z.enum(['IMPRESSIONS', 'LINK_CLICKS']).default('IMPRESSIONS'),
  optimizationGoal: z.enum([
    'LINK_CLICKS',
    'LANDING_PAGE_VIEWS',
    'IMPRESSIONS',
    'REACH',
    'POST_ENGAGEMENT',
    'OFFSITE_CONVERSIONS'
  ]).default('LINK_CLICKS'),
  dailyBudget: z.number().int().positive('Daily budget must be positive (in cents)').optional(),
  lifetimeBudget: z.number().int().positive('Lifetime budget must be positive (in cents)').optional(),
  targeting: MetaTargetingSchema,
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  promotedObject: z.record(z.unknown()).optional(),
  bidAmount: z.number().int().positive().optional(),
  status: z.enum(['ACTIVE', 'PAUSED']).default('PAUSED')
});

export type CreateMetaAdSetInput = z.infer<typeof CreateMetaAdSetSchema>;

export const PrepareMetaAdCreativeSchema = z.object({
  title: z.string().max(255).optional(),
  body: z.string().max(2000).optional(),
  callToActionType: MetaAdCallToActionTypeSchema.optional().default('LEARN_MORE'),
  destinationUrl: z.string().url('Invalid destination URL').optional(),
  linkCaption: z.string().max(255).optional()
});

export type PrepareMetaAdCreativeInput = z.infer<typeof PrepareMetaAdCreativeSchema>;

export const PublishMetaAdSchema = z.object({
  campaignId: z.string().uuid().optional(),
  metaAdAccountId: z.string().optional(),
  metaCampaignName: z.string().max(255).optional(),
  metaCampaignObjective: MetaAdObjectiveSchema.optional().default('OUTCOME_TRAFFIC'),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  metaAdSetName: z.string().max(255).optional(),
  targeting: MetaTargetingSchema,
  primaryText: z.string().max(2000).optional(),
  headline: z.string().max(255).optional(),
  callToActionType: MetaAdCallToActionTypeSchema.optional().default('LEARN_MORE'),
  destinationUrl: z.string().url('Invalid destination URL').optional(),
  idempotencyKey: z.string().optional()
});

export type PublishMetaAdInput = z.infer<typeof PublishMetaAdSchema>;

// ==========================================
// Phase 11: Analytics & AI Optimization Schemas
// ==========================================

export const AnalyticsTimeRangeSchema = z.enum(['7D', '14D', '30D', '90D', 'CUSTOM']).default('30D');
export const AnalyticsPlatformFilterSchema = z.enum(['ALL', 'META', 'ORGANIC']).default('ALL');

export const AnalyticsOverviewQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  timeRange: AnalyticsTimeRangeSchema.optional(),
  platform: AnalyticsPlatformFilterSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export type AnalyticsOverviewQueryInput = z.infer<typeof AnalyticsOverviewQuerySchema>;

export const AnalyticsSyncRequestSchema = z.object({
  brandId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  reelId: z.string().uuid().optional(),
  platform: z.enum(['META', 'ALL']).default('META')
});

export type AnalyticsSyncRequestInput = z.infer<typeof AnalyticsSyncRequestSchema>;

export const OptimizationInsightTypeSchema = z.enum([
  'HOOK',
  'CONTENT_ANGLE',
  'CTA',
  'OFFER',
  'AUDIENCE',
  'TIMING',
  'FORMAT',
  'CAPTION',
  'CREATIVE',
  'BUDGET',
  'PLACEMENT',
  'GENERAL'
]);

export const OptimizationPrioritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const OptimizationStatusSchema = z.enum(['PENDING', 'APPLIED', 'DISMISSED']);

export const OptimizationInsightQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  type: OptimizationInsightTypeSchema.optional(),
  priority: OptimizationPrioritySchema.optional(),
  status: OptimizationStatusSchema.optional()
});

export type OptimizationInsightQueryInput = z.infer<typeof OptimizationInsightQuerySchema>;

export const ExperimentTypeSchema = z.enum(['HOOK', 'CTA', 'CAPTION', 'CREATIVE', 'OFFER']);
export const ExperimentStatusSchema = z.enum(['DRAFT', 'RUNNING', 'COMPLETED', 'INCONCLUSIVE']);

export const ExperimentVariantSchema = z.object({
  label: z.string().min(1),
  reelId: z.string().uuid().optional(),
  content: z.record(z.unknown()).default({}),
  impressions: z.number().int().nonnegative().optional().default(0),
  conversions: z.number().int().nonnegative().optional().default(0),
  clicks: z.number().int().nonnegative().optional().default(0),
  videoViews: z.number().int().nonnegative().optional().default(0),
  metricValue: z.number().optional()
});

export const CreateExperimentSchema = z.object({
  brandId: z.string().uuid(),
  name: z.string().min(2).max(255),
  experimentType: ExperimentTypeSchema,
  variantA: ExperimentVariantSchema,
  variantB: ExperimentVariantSchema,
  targetMetric: z.string().min(1).default('conversionRate')
});

export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;

export const UpdateExperimentSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  status: ExperimentStatusSchema.optional(),
  variantA: ExperimentVariantSchema.optional(),
  variantB: ExperimentVariantSchema.optional(),
  targetMetric: z.string().optional(),
  sampleSizeA: z.number().int().nonnegative().optional(),
  sampleSizeB: z.number().int().nonnegative().optional(),
  confidenceScore: z.number().min(0).max(1).optional().nullable(),
  winningVariant: z.enum(['A', 'B', 'INCONCLUSIVE']).optional().nullable(),
  resultSummary: z.string().optional().nullable()
});

export type UpdateExperimentInput = z.infer<typeof UpdateExperimentSchema>;

export const WinningPatternSchema = z.object({
  type: z.string(),
  key: z.string(),
  evidence: z.string(),
  metricLift: z.string()
});

export const UnderperformingPatternSchema = z.object({
  type: z.string(),
  key: z.string(),
  evidence: z.string(),
  metricDrag: z.string()
});

export const RecommendationItemSchema = z.object({
  type: OptimizationInsightTypeSchema,
  priority: OptimizationPrioritySchema,
  title: z.string(),
  recommendation: z.string(),
  reason: z.string(),
  supportingMetrics: z.record(z.unknown()).default({}),
  sourceContent: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.85),
  expectedImpact: z.string(),
  implementationGuidance: z.string()
});

export const FutureContentGuidanceSchema = z.object({
  recommendedHooks: z.array(z.string()).default([]),
  recommendedMessagingAngles: z.array(z.string()).default([]),
  recommendedCTAs: z.array(z.string()).default([]),
  recommendedContentPillars: z.array(z.string()).default([]),
  recommendedDurations: z.array(z.number()).default([]),
  recommendedFormats: z.array(z.string()).default([]),
  patternsToAvoid: z.array(z.string()).default([])
});

export const ExperimentSuggestionSchema = z.object({
  hypothesis: z.string(),
  type: ExperimentTypeSchema,
  variantA: z.string(),
  variantB: z.string(),
  targetMetric: z.string(),
  expectedOutcome: z.string()
});

export const AIOptimizationOutputSchema = z.object({
  summary: z.string(),
  winningPatterns: z.array(WinningPatternSchema).default([]),
  underperformingPatterns: z.array(UnderperformingPatternSchema).default([]),
  recommendations: z.array(RecommendationItemSchema).default([]),
  nextContentGuidance: FutureContentGuidanceSchema,
  experimentSuggestions: z.array(ExperimentSuggestionSchema).default([])
});

export type AIOptimizationOutput = z.infer<typeof AIOptimizationOutputSchema>;

// ==========================================
// Phase 12: Autonomous Campaign Optimization & Execution Engine Schemas
// ==========================================

export const OptimizationActionTypeSchema = z.enum([
  'CHANGE_HOOK',
  'CHANGE_MESSAGING_ANGLE',
  'CHANGE_CTA',
  'CHANGE_CONTENT_PILLAR',
  'CHANGE_DURATION',
  'CHANGE_VISUAL_STYLE',
  'CREATE_VARIANT',
  'RECOMMEND_AUDIENCE_CHANGE',
  'RECOMMEND_PLACEMENT_CHANGE',
  'RECOMMEND_BUDGET_CHANGE',
  'PAUSE_RECOMMENDATION',
  'REPLACE_CREATIVE'
]);

export type OptimizationActionType = z.infer<typeof OptimizationActionTypeSchema>;

export const OptimizationActionStatusSchema = z.enum([
  'PROPOSED',
  'APPROVED',
  'REJECTED',
  'APPLIED',
  'FAILED'
]);

export type OptimizationActionStatus = z.infer<typeof OptimizationActionStatusSchema>;

export const OptimizationActionQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  reelId: z.string().uuid().optional(),
  status: OptimizationActionStatusSchema.optional(),
  actionType: OptimizationActionTypeSchema.optional()
});

export type OptimizationActionQueryInput = z.infer<typeof OptimizationActionQuerySchema>;

export const CreateOptimizationActionSchema = z.object({
  brandId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  reelId: z.string().uuid().optional().nullable(),
  actionType: OptimizationActionTypeSchema,
  targetEntity: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.85),
  expectedImpact: z.string().min(1),
  sourceMetrics: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({})
});

export type CreateOptimizationActionInput = z.infer<typeof CreateOptimizationActionSchema>;

export const RejectOptimizationActionSchema = z.object({
  reason: z.string().max(1000).optional()
});

export type RejectOptimizationActionInput = z.infer<typeof RejectOptimizationActionSchema>;

export const ApplyOptimizationActionSchema = z.object({
  force: z.boolean().optional().default(false),
  options: z.record(z.unknown()).optional().default({})
});

export type ApplyOptimizationActionInput = z.infer<typeof ApplyOptimizationActionSchema>;

export const CampaignDirectorRunRequestSchema = z.object({
  brandId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  focusObjective: z.string().max(500).optional()
});

export type CampaignDirectorRunRequestInput = z.infer<typeof CampaignDirectorRunRequestSchema>;

export const CampaignDirectorOutputSchema = z.object({
  summary: z.string().min(1),
  winningPatterns: z.array(z.string()).default([]),
  weakPatterns: z.array(z.string()).default([]),
  strategicDirectives: z.array(z.string()).default([]),
  contentRequirements: z.array(
    z.object({
      pillar: z.string(),
      angle: z.string(),
      recommendedHookType: z.string(),
      suggestedDurationSeconds: z.number(),
      suggestedCTA: z.string(),
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
    })
  ).default([]),
  proposedActions: z.array(
    z.object({
      actionType: OptimizationActionTypeSchema,
      targetEntity: z.string(),
      reason: z.string(),
      evidence: z.string(),
      confidence: z.number().min(0).max(1),
      expectedImpact: z.string(),
      sourceMetrics: z.record(z.unknown()).default({})
    })
  ).default([])
});

export type CampaignDirectorOutputValidation = z.infer<typeof CampaignDirectorOutputSchema>;

export const AutonomousLoopRunRequestSchema = z.object({
  brandId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  contentPlanDurationDays: z.number().int().min(1).max(30).optional().default(7),
  generateBlueprints: z.boolean().optional().default(true),
  renderVideos: z.boolean().optional().default(true),
  stopAtApprovalGateway: z.boolean().optional().default(true)
});

export type AutonomousLoopRunRequestInput = z.infer<typeof AutonomousLoopRunRequestSchema>;

// ==========================================
// Phase 13: Autonomous Operations Schemas
// ==========================================

export const AutonomousOperatingModeSchema = z.enum(['AUTONOMOUS', 'CONTROLLED']);

export const AutonomousPolicyStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'DISABLED']);

export const AutonomousAdvertisingPolicySchema = z.object({
  enabled: z.boolean().default(true),
  maxDailySpend: z.number().min(0).max(100000).default(50),
  maxCampaignSpend: z.number().min(0).max(500000).default(250),
  maxCampaignsPerDay: z.number().int().min(1).max(50).default(3),
  maxNewAdsPerDay: z.number().int().min(1).max(100).default(10)
});

export const AutonomousContentPolicySchema = z.object({
  maxReelsPerDay: z.number().int().min(1).max(50).default(10),
  maxReelsPerCampaign: z.number().int().min(1).max(100).default(30)
});

export const AutonomousOptimizationPolicySchema = z.object({
  autoApply: z.boolean().default(true),
  allowedActions: z.array(z.string()).default([
    'CHANGE_HOOK',
    'CHANGE_MESSAGING_ANGLE',
    'CHANGE_CTA',
    'CHANGE_CONTENT_PILLAR',
    'CHANGE_DURATION',
    'CHANGE_VISUAL_STYLE',
    'CREATE_VARIANT',
    'REPLACE_CREATIVE',
    'PAUSE_RECOMMENDATION'
  ])
});

export const AutonomousTargetingPolicySchema = z.object({
  allowedCountries: z.array(z.string()).default([]),
  allowedAgeRange: z
    .object({
      min: z.number().int().min(13).max(65).optional(),
      max: z.number().int().min(18).max(65).optional()
    })
    .default({}),
  allowedPlacements: z.array(z.string()).default([])
});

export const AutonomousBrandPolicySchema = z.object({
  enforceBrandRules: z.boolean().default(true),
  enforceBrandColors: z.boolean().default(true),
  enforceApprovedAssets: z.boolean().default(true)
});

export const AutonomousPolicySchema = z.object({
  mode: AutonomousOperatingModeSchema.default('CONTROLLED'),
  status: AutonomousPolicyStatusSchema.default('ACTIVE'),
  advertising: AutonomousAdvertisingPolicySchema.default({}),
  content: AutonomousContentPolicySchema.default({}),
  optimization: AutonomousOptimizationPolicySchema.default({}),
  targeting: AutonomousTargetingPolicySchema.default({}),
  brand: AutonomousBrandPolicySchema.default({})
});

export type AutonomousPolicyInput = z.infer<typeof AutonomousPolicySchema>;

export const UpdateAutonomousPolicySchema = z.object({
  mode: AutonomousOperatingModeSchema.optional(),
  status: AutonomousPolicyStatusSchema.optional(),
  advertising: AutonomousAdvertisingPolicySchema.partial().optional(),
  content: AutonomousContentPolicySchema.partial().optional(),
  optimization: AutonomousOptimizationPolicySchema.partial().optional(),
  targeting: AutonomousTargetingPolicySchema.partial().optional(),
  brand: AutonomousBrandPolicySchema.partial().optional()
});

export type UpdateAutonomousPolicyInput = z.infer<typeof UpdateAutonomousPolicySchema>;

export const TriggerAutonomousRunSchema = z.object({
  brandId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  forceAutonomousMode: z.boolean().optional(),
  skipPublish: z.boolean().optional().default(false),
  daysToPlan: z.number().int().min(1).max(30).optional().default(7)
});

export type TriggerAutonomousRunInput = z.infer<typeof TriggerAutonomousRunSchema>;

export const AutonomousQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  status: z.string().optional(),
  brandId: z.string().uuid().optional()
});

export type AutonomousQueryInput = z.infer<typeof AutonomousQuerySchema>;

export const AutonomousRunStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'PAUSED',
  'STOPPED_AT_APPROVAL',
  'APPROVAL_REQUIRED',
  'WAITING_FOR_ASSET',
  'WAITING_FOR_PROVIDER',
  'RENDER_FAILED',
  'BLOCKED',
  'SAFETY_BLOCKED',
  'LIMIT_REACHED',
  'FAILED',
  'PUBLISH'
]);
export type AutonomousRunStatusInput = z.infer<typeof AutonomousRunStatusSchema>;

export const AutonomousRunStepNameSchema = z.enum([
  'ANALYTICS_SYNC',
  'DIRECTOR_EVALUATION',
  'OPTIMIZATION_APPLY',
  'CONTENT_PLAN_GENERATION',
  'PRODUCT_SELECTION',
  'BLUEPRINT_GENERATION',
  'PRODUCT_ASSET_VALIDATION',
  'VEO_SCENE_GENERATION',
  'VEO_POLLING',
  'VOICE_GENERATION',
  'CAPTION_GENERATION',
  'AUDIO_RESOLUTION',
  'PRODUCTION_PACKAGE',
  'ANIMATION_INTELLIGENCE',
  'VIDEO_ASSEMBLY',
  'VIDEO_RENDERING',
  'VIDEO_QA',
  'BRAND_SAFETY',
  'BRAND_SAFETY_CHECK',
  'COMMERCIAL_CLAIM_VALIDATION',
  'APPROVAL',
  'BUDGET_GUARDRAILS_CHECK',
  'META_PUBLISHING',
  'PUBLISH',
  'LEARNING',
  'AUDIT_RECORDING'
]);
export type AutonomousRunStepNameInput = z.infer<typeof AutonomousRunStepNameSchema>;

export const EmergencyPauseSchema = z.object({
  reason: z.string().max(500).optional().default('Manual emergency pause requested by user')
});

export type EmergencyPauseInput = z.infer<typeof EmergencyPauseSchema>;

// ==========================================
// Phase 15: SaaS & Commercialization Schemas
// ==========================================

export const SubscriptionTierSchema = z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']);
export type SubscriptionTierInput = z.infer<typeof SubscriptionTierSchema>;

export const SubscriptionBillingIntervalSchema = z.enum(['month', 'year']);
export type SubscriptionBillingIntervalInput = z.infer<typeof SubscriptionBillingIntervalSchema>;

export const CreateCheckoutSessionSchema = z.object({
  tier: SubscriptionTierSchema,
  interval: SubscriptionBillingIntervalSchema.default('month'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});
export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionSchema>;

export const CreatePortalSessionSchema = z.object({
  returnUrl: z.string().url().optional()
});
export type CreatePortalSessionInput = z.infer<typeof CreatePortalSessionSchema>;

export const BillingWebhookPayloadSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  data: z.object({
    object: z.record(z.unknown())
  })
});
export type BillingWebhookPayloadInput = z.infer<typeof BillingWebhookPayloadSchema>;

// ==========================================
// Google Veo 3.1 Schemas
// ==========================================

export const VeoResolutionSchema = z.enum(['720p', '1080p']);
export const VeoAspectRatioSchema = z.enum(['9:16', '16:9', '1:1']);
export const VeoDurationSchema = z.union([z.literal(4), z.literal(6), z.literal(8), z.number()]);

export const VeoImageInputSchema = z.object({
  imageBytes: z.string().optional(),
  uri: z.string().optional(),
  mimeType: z.string().optional()
});

export const VeoReferenceImageSchema = z.object({
  image: VeoImageInputSchema,
  referenceType: z.enum(['REFERENCE_TYPE_SUBJECT', 'REFERENCE_TYPE_STYLE', 'REFERENCE_TYPE_ASSET']).or(z.string()).optional(),
  referenceId: z.number().optional()
});

export const VeoVideoGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required for video generation'),
  model: z.string().optional().default('veo-3.1-generate-preview'),
  aspectRatio: VeoAspectRatioSchema.optional().default('9:16'),
  durationSeconds: VeoDurationSchema.optional().default(8),
  resolution: VeoResolutionSchema.optional().default('720p'),
  fps: z.number().optional().default(24),
  negativePrompt: z.string().optional(),
  enhancePrompt: z.boolean().optional(),
  generateAudio: z.boolean().optional().default(false),
  seed: z.number().optional(),
  personGeneration: z.enum(['dont_allow', 'allow_adult']).or(z.string()).optional(),
  numberOfVideos: z.number().optional().default(1),
  workspaceId: z.string().optional(),
  reelPlanId: z.string().optional(),
  sceneNumber: z.number().optional()
});
export type VeoVideoGenerationValidatedInput = z.infer<typeof VeoVideoGenerationSchema>;

export const VeoImageToVideoSchema = VeoVideoGenerationSchema.extend({
  prompt: z.string().optional().default(''),
  image: VeoImageInputSchema,
  lastFrame: VeoImageInputSchema.optional()
});
export type VeoImageToVideoValidatedInput = z.infer<typeof VeoImageToVideoSchema>;

export const VeoReferenceVideoSchema = VeoVideoGenerationSchema.extend({
  referenceImages: z.array(VeoReferenceImageSchema).min(1, 'At least one reference image is required')
});
export type VeoReferenceVideoValidatedInput = z.infer<typeof VeoReferenceVideoSchema>;export const SceneVideoArtifactSchema = z.object({
  sceneNumber: z.number().int().min(1),
  duration: z.number().positive(),
  provider: z.string().default('veo-3.1-generate-preview'),
  source: z.enum(['VEO', 'MEDIA_ASSET', 'GENERATED']).default('VEO'),
  videoUrl: z.string().min(1),
  storageKey: z.string().optional(),
  localPath: z.string().optional(),
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().positive().default(30),
  status: z.enum(['READY', 'GENERATING', 'FAILED']).default('READY'),
  generationMetadata: z.record(z.unknown()).optional()
});
export type SceneVideoArtifactValidated = z.infer<typeof SceneVideoArtifactSchema>;

export const ReelQAReportSchema = z.object({
  valid: z.boolean(),
  duration: z.object({
    target: z.number(),
    actual: z.number(),
    passed: z.boolean()
  }),
  dimensions: z.object({
    target: z.object({ width: z.number(), height: z.number() }),
    actual: z.object({ width: z.number(), height: z.number() }),
    passed: z.boolean()
  }),
  codecs: z.object({
    video: z.string(),
    audio: z.string(),
    passed: z.boolean()
  }),
  audioCheck: z.object({
    hasAudio: z.boolean(),
    isNonSilent: z.boolean(),
    passed: z.boolean()
  }),
  visualVariance: z.object({
    averageStdDev: z.number(),
    uniqueColors: z.number(),
    passed: z.boolean()
  }),
  sceneCoverage: z.object({
    totalScenes: z.number(),
    renderedScenes: z.number(),
    passed: z.boolean()
  }),
  productPresence: z.object({
    detected: z.boolean(),
    productId: z.string().nullable().optional(),
    passed: z.boolean()
  }),
  brandPresence: z.object({
    detected: z.boolean(),
    logoPresent: z.boolean(),
    passed: z.boolean()
  }),
  ctaPresence: z.object({
    detected: z.boolean(),
    passed: z.boolean()
  }),
  frameIntegrity: z.object({
    noBlackFrames: z.boolean(),
    noBlankFrames: z.boolean(),
    noFrozenFrames: z.boolean(),
    passed: z.boolean()
  }),
  failureReasons: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  inspectedAt: z.string()
});
export type ReelQAReportValidated = z.infer<typeof ReelQAReportSchema>;

export function sanitizeSingleUuid(uuid?: string | null): string {
  if (!uuid || typeof uuid !== 'string') return '';
  const trimmed = uuid.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : '';
}

