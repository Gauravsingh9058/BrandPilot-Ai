// User domain
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPasswordHash extends User {
  passwordHash: string;
}

// Session domain
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

// Workspace domain
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface WorkspaceWithMembers extends Workspace {
  members: WorkspaceMember[];
  userRole?: WorkspaceRole;
}

// ==========================================
// Brand Brain Domain (Phase 2)
// ==========================================

export interface BrandColors {
  [key: string]: string | undefined;
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface BrandTypography {
  [key: string]: string | undefined;
  headingFont?: string;
  bodyFont?: string;
  accentFont?: string;
}

export interface Brand {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  websiteUrl?: string | null;
  story?: string | null;
  industry: string;
  targetAudience?: string | null;
  brandVoice?: string | null;
  brandPersonality?: string | null;
  uniqueSellingPoints?: string[];
  pricingInfo?: Record<string, unknown> | null;
  offers?: string[];
  primaryCta?: string | null;
  socialLinks?: Record<string, string>;
  brandColors?: BrandColors;
  typography?: BrandTypography;
  contentPillars?: string[];
  marketingRules?: {
    claimsToAvoid?: string[];
    brandRestrictions?: string[];
    complianceRules?: string[];
  };
  competitorReferences?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandProduct {
  id: string;
  brandId: string;
  name: string;
  description: string;
  category?: string | null;
  price?: number | null;
  currency?: string;
  features?: string[];
  benefits?: string[];
  usps?: string[];
  targetAudience?: string | null;
  offerInfo?: Record<string, unknown> | null;
  cta?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetPurpose = 'HERO' | 'DETAIL' | 'LIFESTYLE' | 'PACKSHOT' | 'LOGO' | 'FEATURE' | string;

export interface BrandAssetMetadata extends Record<string, unknown> {
  isPlaceholder?: boolean;
  isTestAsset?: boolean;
  productId?: string | null;
  assetPurpose?: AssetPurpose;
  sourceType?: string;
  productionEligible?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSizeBytes?: number;
  tags?: string[];
  [key: string]: unknown;
}

export type BrandAssetType = 'LOGO' | 'COLOR_PALETTE' | 'FONT' | 'PRODUCT_IMAGE' | 'PRODUCT_VIDEO' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'OTHER' | string;

export interface BrandAsset {
  id: string;
  brandId: string;
  workspaceId?: string;
  type: BrandAssetType;
  name: string;
  storageKey: string;
  url: string;
  isPlaceholder?: boolean;
  isTestAsset?: boolean;
  productId?: string | null;
  assetPurpose?: AssetPurpose;
  sourceType?: string;
  productionEligible?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  metadata?: BrandAssetMetadata;
  createdAt?: Date | string;
}

// Brand DNA Structured Intelligence Model
export interface BrandDNAIdentity {
  brandName: string;
  industry: string;
  story: string;
  mission: string;
  personality: string[];
}

export interface BrandDNAAudience {
  primaryAudience: string;
  demographics: string[];
  painPoints: string[];
  desires: string[];
  buyingMotivations: string[];
}

export interface BrandDNAMessaging {
  positioning: string;
  coreMessage: string;
  valueProposition: string;
  usps: string[];
  proofPoints: string[];
  tone: string[];
  forbiddenMessaging: string[];
}

export interface BrandDNAProductItem {
  name: string;
  category?: string;
  benefits: string[];
  features: string[];
  price?: number;
  usps: string[];
  targetAudience?: string;
  offers?: string[];
  cta?: string;
}

export interface BrandDNAVisualIdentity {
  logoUrl?: string;
  colors: BrandColors;
  typography: BrandTypography;
  visualStyle: string;
  imageStyle: string;
}

export interface BrandDNAContentStrategy {
  contentPillars: string[];
  preferredTopics: string[];
  educationalTopics: string[];
  promotionalTopics: string[];
  storytellingTopics: string[];
}

export interface BrandDNAPromotionRules {
  primaryCTA: string;
  offers: string[];
  claimsToAvoid: string[];
  complianceRules: string[];
  brandRestrictions: string[];
}

export interface BrandDNA {
  id: string;
  brandId: string;
  version: number;
  identity: BrandDNAIdentity;
  audience: BrandDNAAudience;
  messaging: BrandDNAMessaging;
  products: BrandDNAProductItem[];
  visualIdentity: BrandDNAVisualIdentity;
  contentStrategy: BrandDNAContentStrategy;
  promotionRules: BrandDNAPromotionRules;
  generatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BrandDNAOutput = Omit<BrandDNA, 'id' | 'brandId' | 'version' | 'generatedBy' | 'createdAt' | 'updatedAt'>;
export type BrandDna = BrandDNA;
export type BrandDnaOutput = BrandDNAOutput;

export interface BrandWithDetails extends Brand {
  products: BrandProduct[];
  assets: BrandAsset[];
  latestDna?: BrandDNA | null;
  dnaStatus: 'READY' | 'NOT_GENERATED';
}

export interface CreateBrandInput {
  name: string;
  description: string;
  websiteUrl?: string | null;
  story?: string | null;
  industry: string;
  targetAudience?: string | null;
  brandVoice?: string | null;
  brandPersonality?: string | null;
  uniqueSellingPoints?: string[];
  pricingInfo?: Record<string, unknown> | null;
  offers?: string[];
  primaryCta?: string | null;
  socialLinks?: Record<string, string>;
  brandColors?: BrandColors;
  typography?: BrandTypography;
  contentPillars?: string[];
  marketingRules?: {
    claimsToAvoid?: string[];
    brandRestrictions?: string[];
    complianceRules?: string[];
  };
  competitorReferences?: string[];
}

export type UpdateBrandInput = Partial<CreateBrandInput>;

export interface CreateProductInput {
  name: string;
  description: string;
  category?: string | null;
  price?: number | null;
  currency?: string;
  features?: string[];
  benefits?: string[];
  usps?: string[];
  targetAudience?: string | null;
  offerInfo?: Record<string, unknown> | null;
  cta?: string | null;
  metadata?: Record<string, unknown>;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CreateBrandAssetInput {
  type: BrandAssetType;
  name: string;
  storageKey: string;
  url: string;
  productId?: string | null;
  assetPurpose?: AssetPurpose;
  productionEligible?: boolean;
  isPlaceholder?: boolean;
  isTestAsset?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface AssignAssetToProductInput {
  productId?: string | null;
  assetPurpose?: AssetPurpose;
  productionEligible?: boolean;
}

export interface UpdateBrandDNAInput {
  identity?: Partial<BrandDNAIdentity>;
  audience?: Partial<BrandDNAAudience>;
  messaging?: Partial<BrandDNAMessaging>;
  products?: BrandDNAProductItem[];
  visualIdentity?: Partial<BrandDNAVisualIdentity>;
  contentStrategy?: Partial<BrandDNAContentStrategy>;
  promotionRules?: Partial<BrandDNAPromotionRules>;
}

// ==========================================
// Phase 3: Marketing Brain & Campaign Engine Domain
// ==========================================

export type MarketingObjective =
  | 'BRAND_AWARENESS'
  | 'PRODUCT_AWARENESS'
  | 'LEAD_GENERATION'
  | 'SALES'
  | 'PRODUCT_LAUNCH'
  | 'PROMOTION'
  | 'CUSTOMER_ACQUISITION'
  | 'ENGAGEMENT'
  | 'WEBSITE_TRAFFIC'
  | 'APP_DOWNLOADS'
  | 'COMMUNITY_GROWTH'
  | 'RETENTION';

export type CampaignStatus =
  | 'DRAFT'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ARCHIVED';

export type FunnelStageName = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';

// Marketing Strategy Sub-Models
export interface MarketingTargetAudience {
  primarySegments: string[];
  psychographics: string[];
  buyingTriggers: string[];
  objectionsToOvercome: string[];
}

export interface MarketingPositioning {
  marketCategory: string;
  competitiveMoat: string;
  valuePropositionStatement: string;
  differentiators: string[];
}

export interface MarketingMessagingStrategy {
  brandNarrativeHook: string;
  keyThemes: string[];
  primaryAngles: string[];
  voiceGuidance: string;
}

export interface ContentPillarSpec {
  name: string;
  purpose: string;
  audienceNeed: string;
  messagingAngle: string;
  recommendedFormats: string[];
}

export interface ContentMixItem {
  type: string;
  percentage: number;
  purpose: string;
  funnelStage: string;
}

export interface MarketingContentStrategy {
  pillars: ContentPillarSpec[];
  contentMix: ContentMixItem[];
  educationalThemes: string[];
  promotionalThemes: string[];
  storytellingThemes: string[];
  socialProofThemes: string[];
  engagementThemes: string[];
}

export interface FunnelStageStrategy {
  stage: FunnelStageName;
  audienceState: string;
  objective: string;
  messageFocus: string;
  contentRole: string;
  ctaBehavior: string;
}

export interface MarketingFunnelStrategy {
  stages: FunnelStageStrategy[];
}

export interface ChannelGuidanceItem {
  channel: string;
  role: string;
  contentApproach: string;
  formatGuidance: string;
  ctaStrategy: string;
}

export interface MarketingChannelStrategy {
  recommendedChannels: string[];
  channelGuidance: ChannelGuidanceItem[];
}

export interface MarketingOfferStrategy {
  recommendedOffers: string[];
  urgencyMechanisms: string[];
  riskReversals: string[];
}

export interface MarketingKPIStrategy {
  primaryKPIs: string[];
  secondaryKPIs: string[];
  awarenessKPIs: string[];
  considerationKPIs: string[];
  conversionKPIs: string[];
}

export interface MarketingGuardrails {
  claimsToAvoid: string[];
  restrictedTopics: string[];
  brandRestrictions: string[];
  toneRestrictions: string[];
  complianceNotes: string[];
}

// Persistent Marketing Strategy Model
export interface MarketingStrategy {
  id: string;
  brandId: string;
  version: number;
  objective: MarketingObjective | string;
  businessGoal: string;
  marketingGoal: string;
  targetAudience: MarketingTargetAudience;
  positioning: MarketingPositioning;
  messagingStrategy: MarketingMessagingStrategy;
  contentStrategy: MarketingContentStrategy;
  funnelStrategy: MarketingFunnelStrategy;
  channelStrategy: MarketingChannelStrategy;
  offerStrategy: MarketingOfferStrategy;
  kpiStrategy: MarketingKPIStrategy;
  risksAndGuardrails: MarketingGuardrails;
  aiMetadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type MarketingStrategyOutput = Omit<MarketingStrategy, 'id' | 'brandId' | 'version' | 'createdAt' | 'updatedAt' | 'aiMetadata'>;

export interface GenerateMarketingStrategyInput {
  objective: MarketingObjective | string;
  businessGoal: string;
  marketingGoal: string;
  campaignRequirements?: string;
}

export interface UpdateMarketingStrategyInput {
  objective?: MarketingObjective | string;
  businessGoal?: string;
  marketingGoal?: string;
  targetAudience?: Partial<MarketingTargetAudience>;
  positioning?: Partial<MarketingPositioning>;
  messagingStrategy?: Partial<MarketingMessagingStrategy>;
  contentStrategy?: Partial<MarketingContentStrategy>;
  funnelStrategy?: Partial<MarketingFunnelStrategy>;
  channelStrategy?: Partial<MarketingChannelStrategy>;
  offerStrategy?: Partial<MarketingOfferStrategy>;
  kpiStrategy?: Partial<MarketingKPIStrategy>;
  risksAndGuardrails?: Partial<MarketingGuardrails>;
}

// Campaign Strategy Model
export interface CampaignStrategyAudience {
  primary: string;
  secondary?: string;
  painPoints: string[];
  desires: string[];
  motivations: string[];
}

export interface CampaignFunnel {
  awareness: { message: string; formatGuidance: string; cta: string };
  consideration: { message: string; formatGuidance: string; cta: string };
  conversion: { message: string; formatGuidance: string; cta: string };
}

export interface CampaignStrategy {
  objective: string;
  audience: CampaignStrategyAudience;
  positioning: string;
  corePromise: string;
  keyMessages: string[];
  messagingAngles: string[];
  contentPillars: string[];
  contentMix: ContentMixItem[];
  funnel: CampaignFunnel;
  offerStrategy: string;
  ctaStrategy: string;
  channelStrategy: ChannelGuidanceItem[];
  kpis: {
    primary: string[];
    targets: string[];
  };
  guardrails: {
    claimsToAvoid: string[];
    restrictions: string[];
  };
}

export type CampaignStrategyOutput = CampaignStrategy;

// Persistent Campaign Entity
export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  description: string;
  objective: MarketingObjective | string;
  status: CampaignStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  targetAudience?: Record<string, unknown>;
  coreMessage?: string | null;
  offer?: string | null;
  primaryCta?: string | null;
  contentPillars: string[];
  channels: string[];
  campaignStrategy?: CampaignStrategy | null;
  strategyVersion: number;
  kpis?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignInput {
  name: string;
  description: string;
  objective: MarketingObjective | string;
  status?: CampaignStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  targetAudience?: Record<string, unknown>;
  coreMessage?: string | null;
  offer?: string | null;
  primaryCta?: string | null;
  contentPillars?: string[];
  channels?: string[];
  kpis?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>;

export interface GenerateCampaignStrategyInput {
  campaignGoal?: string;
  additionalRequirements?: string;
}

// ==========================================
// Phase 4: 30-Day Content Planner Types
// ==========================================

export type ContentType =
  | 'EDUCATIONAL'
  | 'PROMOTIONAL'
  | 'STORYTELLING'
  | 'SOCIAL_PROOF'
  | 'ENGAGEMENT'
  | 'AUTHORITY'
  | 'BEHIND_THE_SCENES'
  | 'PROBLEM_AGITATION';

export type ContentFormat =
  | 'SHORT_REEL'
  | 'TALKING_HEAD_REEL'
  | 'PRODUCT_SHOWCASE_REEL'
  | 'TUTORIAL_REEL'
  | 'TESTIMONIAL_REEL'
  | 'TREND_REEL'
  | 'CAROUSEL_CONCEPT'
  | 'IMAGE_POST'
  | 'STORY_SEQUENCE';

export type ContentPlatform =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'YOUTUBE_SHORTS'
  | 'FACEBOOK'
  | 'LINKEDIN'
  | 'TWITTER';

export type ContentPlanStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'READY'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED';

export type ContentJobStatus =
  | 'PLANNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export type ContentJobPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WeeklyNarrative {
  weekNumber: number;
  theme: string;
  focusObjective: string;
  funnelFocus: string;
  strategicPurpose: string;
}

export interface DiversificationMetrics {
  score: number;
  passed: boolean;
  warnings: string[];
  metrics: {
    totalJobs: number;
    uniquePillarsCount: number;
    funnelDistribution: Record<string, number>;
    contentTypeDistribution: Record<string, number>;
    formatDistribution: Record<string, number>;
    repetitionIssuesCount: number;
    consecutiveDuplicatesCount: number;
  };
  repetitionIssues: Array<{
    dayNumberA: number;
    dayNumberB: number;
    type: string;
    description: string;
  }>;
}

export interface ContentPlan {
  id: string;
  brandId: string;
  campaignId?: string | null;
  workspaceId: string;
  name: string;
  objective: string;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  status: ContentPlanStatus;
  version: number;
  planGroupId: string;
  strategySnapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentJob {
  id: string;
  contentPlanId: string;
  brandId: string;
  campaignId?: string | null;
  workspaceId: string;
  dayNumber: number;
  scheduledDate: Date;
  title: string;
  contentType: ContentType;
  funnelStage: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';
  contentPillar: string;
  objective: string;
  audience: string;
  topic: string;
  hook: string;
  keyMessage: string;
  messagingAngle: string;
  offer?: string | null;
  cta: string;
  platform: ContentPlatform;
  format: ContentFormat;
  priority: ContentJobPriority;
  status: ContentJobStatus;
  strategy: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentPlanWithJobs extends ContentPlan {
  jobs: ContentJob[];
}

export interface ContentJobOutput {
  dayNumber: number;
  weekNumber: number;
  title: string;
  contentType: ContentType;
  funnelStage: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';
  contentPillar: string;
  objective: string;
  audience: string;
  topic: string;
  hook: string;
  keyMessage: string;
  messagingAngle: string;
  offer?: string | null;
  cta: string;
  platform: ContentPlatform;
  format: ContentFormat;
  priority: ContentJobPriority;
  suggestedVisualHook?: string;
  suggestedAudioConcept?: string;
  keyTakeaway?: string;
  strategicRationale?: string;
}

export interface ContentPlanOutput {
  planName: string;
  objective: string;
  durationDays: number;
  campaignTheme: string;
  executiveSummary: string;
  weeklyNarratives: WeeklyNarrative[];
  diversificationSummary: {
    funnelDistribution: Record<string, number>;
    contentTypeDistribution: Record<string, number>;
    formatDistribution: Record<string, number>;
    pillarDistribution: Record<string, number>;
  };
  jobs: ContentJobOutput[];
}

export interface CreateContentPlanInput {
  name: string;
  objective: string;
  campaignId?: string | null;
  startDate?: Date | string;
  endDate?: Date | string;
  durationDays?: number;
  strategySnapshot?: Record<string, unknown>;
}

export interface UpdateContentPlanInput {
  name?: string;
  objective?: string;
  status?: ContentPlanStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  strategySnapshot?: Record<string, unknown>;
}

export interface GenerateContentPlanInput {
  campaignId?: string | null;
  name?: string;
  objective?: string;
  durationDays?: number;
  startDate?: Date | string | null;
  platforms?: ContentPlatform[];
  customGuidance?: string | null;
  regenerate?: boolean;
  preserveApprovedJobs?: boolean;
}

export interface UpdateContentJobInput {
  title?: string;
  dayNumber?: number;
  contentType?: ContentType;
  funnelStage?: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';
  contentPillar?: string;
  objective?: string;
  audience?: string;
  topic?: string;
  hook?: string;
  keyMessage?: string;
  messagingAngle?: string;
  offer?: string | null;
  cta?: string;
  platform?: ContentPlatform;
  format?: ContentFormat;
  priority?: ContentJobPriority;
  status?: ContentJobStatus;
  scheduledDate?: Date | string;
  strategy?: Record<string, unknown>;
}

export interface UpdateContentJobStatusInput {
  status: ContentJobStatus;
}

// ==========================================
// API Response Standard
// ==========================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
}

// Health Check Response
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  services: {
    api: ServiceHealth;
    postgres: ServiceHealth;
    redis: ServiceHealth;
  };
  environment: string;
  version: string;
}

// Queue Job Domain
export interface TestJobPayload {
  id: string;
  message: string;
  timestamp: number;
  triggeredBy?: string;
}

export interface TestJobResult {
  jobId: string;
  processedAt: string;
  status: 'completed' | 'failed';
  output: string;
}

// AI Provider Contracts
export interface AIProviderConfig {
  apiKey: string;
  modelName?: string;
  temperature?: number;
}

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  timeoutMs?: number;
}

export interface AITextResponse {
  text: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  readonly providerName: string;
  generateText(prompt: string, options?: AIGenerationOptions): Promise<AITextResponse>;
  generateStructured<T>(prompt: string, schema: unknown, options?: AIGenerationOptions): Promise<T>;
}

// Unified AI Provider State & Diagnostics
export type AIUnifiedProviderStatus =
  | 'AVAILABLE'
  | 'DEGRADED'
  | 'QUOTA_EXHAUSTED'
  | 'AUTH_ERROR'
  | 'MODEL_UNAVAILABLE'
  | 'TEMPORARILY_UNAVAILABLE';

export interface AIProviderErrorRecord {
  provider: 'gemini' | 'veo';
  code: string;
  message: string;
  timestamp: string;
  retryAfterSeconds?: number;
  retryAfterMs?: number;
  statusCode?: number;
}

export interface AIProviderSuccessRecord {
  provider: 'gemini' | 'veo';
  operation: string;
  timestamp: string;
}

export interface AIProviderDiagnosticsReport {
  geminiModel: string;
  veoModel: string;
  providerStatus: AIUnifiedProviderStatus;
  geminiStatus: AIUnifiedProviderStatus;
  veoStatus: AIUnifiedProviderStatus;
  lastError?: AIProviderErrorRecord | null;
  lastSuccess?: AIProviderSuccessRecord | null;
  quotaState: {
    isGeminiExhausted: boolean;
    isVeoExhausted: boolean;
    geminiRetryAfterMs?: number;
    veoRetryAfterMs?: number;
    geminiCooldownUntil?: string | null;
    veoCooldownUntil?: string | null;
  };
  timestamp: string;
}

// Media Provider Contracts
export interface MediaSearchQuery {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  perPage?: number;
  page?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface MediaAsset {
  id: string;
  provider: string;
  type: 'video' | 'image';
  title?: string;
  url: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  photographer?: string;
  photographerUrl?: string;
  isPlaceholder?: boolean;
  isTestAsset?: boolean;
  productId?: string | null;
  assetPurpose?: string;
  productionEligible?: boolean;
}

export interface MediaSearchResult {
  assets: MediaAsset[];
  totalResults: number;
  page: number;
  perPage: number;
}

export interface MediaProvider {
  readonly providerName: string;
  searchVideos(params: MediaSearchQuery): Promise<MediaSearchResult>;
  searchImages(params: MediaSearchQuery): Promise<MediaSearchResult>;
  getAssetById?(id: string): Promise<MediaAsset | null>;
}

// Video Renderer Contracts
export interface RenderTimelineScene {
  id: string;
  durationMs: number;
  mediaAssetUrl?: string;
  captionText?: string;
  visualEffects?: Record<string, unknown>;
}

export interface RenderTimelineSpec {
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
  totalDurationMs: number;
  scenes: RenderTimelineScene[];
  audioTrackUrl?: string;
}

export interface RenderJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  outputVideoUrl?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface VideoRenderer {
  readonly rendererName: string;
  submitRenderJob(spec: RenderTimelineSpec): Promise<{ jobId: string }>;
  getRenderJobStatus(jobId: string): Promise<RenderJobStatus>;
  cancelRenderJob(jobId: string): Promise<boolean>;
}

// Storage Provider Contracts
export interface UploadResult {
  url: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
  filename?: string;
}

export interface StorageProvider {
  readonly providerName: string;
  uploadBuffer(buffer: Buffer, key: string, mimeType: string, filename?: string): Promise<UploadResult>;
  getDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(key: string): Promise<boolean>;
  exists?(key: string): Promise<boolean>;
}

// ==========================================
// Phase 5: Autonomous Reel Orchestrator Domain
// ==========================================

export type ReelStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'GENERATING'
  | 'READY'
  | 'NEEDS_REVIEW'
  | 'IN_PRODUCTION'
  | 'RENDERING'
  | 'RENDERED'
  | 'QUALITY_CHECK'
  | 'READY_FOR_APPROVAL'
  | 'COMPLETED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'READY_FOR_ADS'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'PUBLISHED_TO_META'
  | 'FAILED'
  | 'GENERATION_FAILED'
  | 'RENDER_FAILED'
  | 'RENDER_QUALITY_FAILED'
  | 'PUBLISH_FAILED'
  | 'ARCHIVED';

export interface SceneBackgroundSpec {
  type: 'GRADIENT' | 'AMBIENT_BLUR' | 'SOLID' | 'PARTICLES' | 'VIDEO' | 'SPOTLIGHT';
  primaryColor?: string;
  secondaryColor?: string;
  blurRadius?: number;
  gradientAngle?: number;
  speed?: number;
}

export interface SceneProductMotionSpec {
  assetId?: string;
  sourceUrl?: string;
  visible: boolean;
  position?: { xRatio: number; yRatio: number };
  scale?: number;
  rotationDeg?: number;
  opacity?: number;
  animationPreset:
    | 'CINEMATIC_PUSH_IN'
    | 'SMOOTH_ZOOM'
    | 'FLOATING_PRODUCT'
    | 'HORIZONTAL_REVEAL'
    | 'VERTICAL_REVEAL'
    | 'ROTATION_REVEAL'
    | 'PARALLAX'
    | 'SCALE_OPACITY_ENTRANCE'
    | 'SPOTLIGHT_REVEAL'
    | 'PRODUCT_ORBIT'
    | 'FEATURE_CALLOUT'
    | 'PRODUCT_TO_CTA';
}

export interface SceneLogoMotionSpec {
  assetId?: string;
  sourceUrl?: string;
  visible: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-center';
  scale?: number;
  opacity?: number;
  animationStyle?: 'FADE' | 'SLIDE_DOWN' | 'SCALE_IN' | 'STATIC';
}

export interface SceneTextLayerSpec {
  id: string;
  text: string;
  position?: 'top' | 'center' | 'bottom' | 'callout';
  yRatio?: number;
  fontSize?: number;
  textColor?: string;
  boxColor?: string;
  highlightWords?: string[];
  entrance:
    | 'WORD_POP'
    | 'WORD_HIGHLIGHT'
    | 'SLIDE_IN'
    | 'SCALE_IN'
    | 'BLUR_TO_SHARP'
    | 'MASK_REVEAL'
    | 'EMPHASIS_PULSE'
    | 'HIGHLIGHT_BOX'
    | 'CTA_PULSE';
  duration?: number;
}

export interface SceneShapeSpec {
  type: 'PILL_BADGE' | 'CALLOUT_CARD' | 'SPOTLIGHT_RING' | 'VIGNETTE' | 'BORDER_FRAME';
  color?: string;
  opacity?: number;
  position?: { xRatio: number; yRatio: number };
  size?: { widthRatio: number; heightRatio: number };
}

export interface SceneEffectSpec {
  type: 'MOTION_BLUR' | 'GLOW' | 'DROP_SHADOW' | 'PARTICLE_DUST' | 'LIGHT_LEAK';
  intensity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SceneTransitionSpec {
  type: 'CUT' | 'FADE' | 'CROSSFADE' | 'SLIDE_LEFT' | 'SLIDE_RIGHT' | 'ZOOM_IN' | 'BLUR_DISSOLVE';
  durationSeconds: number;
}

export interface RenderDiagnosticInfo {
  renderId: string;
  sceneId?: string;
  inputAssets?: Array<{
    type: string;
    path: string;
    width?: number;
    height?: number;
    duration?: number;
    exists: boolean;
  }>;
  inputDimensions?: { width: number; height: number };
  filterGraph?: string;
  outputDimensions?: { width: number; height: number };
  duration?: number;
  ffmpegExitCode?: number;
  outputFileSize?: number;
  visualVariance?: number;
  uniqueColors?: number;
  validatedSampleCount?: number;
  failureReason?: string;
}

export type HookType =
  | 'QUESTION'
  | 'PROBLEM'
  | 'CURIOSITY'
  | 'CONTRAST'
  | 'STATEMENT'
  | 'STORY'
  | 'DEMONSTRATION'
  | 'BENEFIT'
  | 'MISTAKE'
  | 'CHALLENGE';

export type SceneVisualType =
  | 'PRODUCT_SHOWCASE'
  | 'PRODUCT_HERO'
  | 'PROBLEM'
  | 'SOLUTION'
  | 'DEMONSTRATION'
  | 'FEATURE_CALLOUT'
  | 'BENEFIT'
  | 'TRANSFORMATION'
  | 'BRAND_IDENTITY'
  | 'LIFESTYLE'
  | 'STORY'
  | 'EDUCATION'
  | 'COMPARISON'
  | 'TESTIMONIAL'
  | 'SOCIAL_PROOF'
  | 'CTA'
  | 'BRAND'
  | 'ABSTRACT'
  | 'TEXT_FOCUS'
  | string;

export type CtaType =
  | 'LEARN_MORE'
  | 'VISIT_WEBSITE'
  | 'SHOP_NOW'
  | 'TRY_NOW'
  | 'SIGN_UP'
  | 'DOWNLOAD'
  | 'FOLLOW'
  | 'COMMENT'
  | 'SAVE'
  | 'SHARE'
  | 'MESSAGE'
  | 'CUSTOM';

export interface ReelConcept {
  title: string;
  concept: string;
  objective: string;
  targetAudience: string;
  corePromise: string;
  emotionalAngle: string;
  messagingAngle: string;
  contentPillar: string;
  funnelStage: 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION';
}

export interface Hook {
  type: HookType;
  text: string;
  visualIntent: string;
  deliveryStyle: string;
  durationSeconds: number;
}

export interface ScriptSegment {
  id: string;
  purpose: string;
  text: string;
  estimatedDuration: number;
  deliveryStyle: string;
  emotionalTone: string;
}

export interface ReelScene {
  sceneNumber: number;
  durationSeconds: number;
  purpose: string;
  narration: string;
  onScreenText: string;
  visualType: SceneVisualType;
  subject: string;
  environment: string;
  composition: string;
  camera: string;
  lighting: string;
  mood: string;
  transition: string;
  animationIntent: string;
  assetRequirement: string;
  productReference?: string | null;
  brandElement?: string | null;
  emphasis?: string | null;
  // Veo 3.1 Director Blueprint extensions
  veoPrompt?: string;
  veoNegativePrompt?: string;
  cameraMovement?: string;
  motion?: string;
  productPreservationRules?: string;
  brandPreservationRules?: string;
  textSafeComposition?: boolean | string;
  transitionIntention?: string;
  referenceAssetIds?: string[];
  firstFrameAssetId?: string | null;
  lastFrameAssetId?: string | null;
  veoModel?: string;
  veoOperationId?: string | null;
  veoGenerationStatus?: 'SUBMITTED' | 'POLLING' | 'COMPLETED' | 'FAILED' | string | null;
  failureReason?: string | null;
  // Motion Graphic Specification
  background?: SceneBackgroundSpec;
  product?: SceneProductMotionSpec;
  logo?: SceneLogoMotionSpec;
  textLayers?: SceneTextLayerSpec[];
  shapes?: SceneShapeSpec[];
  effects?: SceneEffectSpec[];
  transitionIn?: SceneTransitionSpec;
  transitionOut?: SceneTransitionSpec;
}

export interface VisualDirection {
  style: string;
  mood: string;
  colorIntent: string;
  lightingIntent: string;
  composition: string;
  cameraLanguage: string;
  pacing: string;
  visualHierarchy: string;
  brandIntegration: string;
  productEmphasis: string;
}

export interface VoiceDirection {
  style: string;
  pace: string;
  tone: string;
  genderPreference?: string;
  language?: string;
  accents?: string;
}

export interface CaptionDirection {
  style: string;
  placement: string;
  density: string;
  fontEmphasis: string;
  animation: string;
}

export interface AnimationDirection {
  energy: string;
  style: string;
  textAnimation: string;
  visualTransitions: string;
  elementMotion: string;
}

export interface AudioDirection {
  musicMood: string;
  soundEffects: string;
  pacing: string;
  mixBalance: string;
}

export interface ReelCTA {
  type: CtaType;
  text: string;
  visualTreatment: string;
  placement: string;
  url?: string | null;
}

export interface ProductionMetadata {
  totalScenes: number;
  estimatedWordCount: number;
  targetDurationSeconds: number;
  calculatedDurationSeconds: number;
  generatedBy: string;
  aiProvider?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  brandDnaVersion?: number;
  marketingStrategyId?: string;
  campaignId?: string;
  contentJobId: string;
  generatedAt: string;
  complianceNotes?: string[];
  warningFlags?: string[];
  renderOutput?: VideoRenderOutput;
  approval?: ApprovalRecord;
}

export interface VideoRenderOutput {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputVideoUrl: string;
  storageKey?: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  resolution?: { width: number; height: number };
  aspectRatio?: string;
  fps?: number;
  renderedAt: string;
  completedAt?: string;
  errorMessage?: string;
  diagnostics?: RenderDiagnosticInfo;
}

export interface ReelProductionPlan {
  id: string;
  contentJobId: string;
  brandId: string;
  campaignId?: string | null;
  contentPlanId: string;
  workspaceId: string;
  targetProductId?: string | null;
  productId?: string | null;
  targetProduct?: string | null;
  version: number;
  title: string;
  concept: ReelConcept;
  objective: string;
  audience: string;
  funnelStage: string;
  contentPillar: string;
  durationSeconds: number;
  aspectRatio: string;
  platform: string;
  format: string;
  hook: Hook;
  narrative: string;
  script: ScriptSegment[];
  scenes: ReelScene[];
  visualDirection: VisualDirection;
  voiceDirection: VoiceDirection;
  captionDirection: CaptionDirection;
  animationDirection: AnimationDirection;
  audioDirection: AudioDirection;
  cta: ReelCTA;
  productionMetadata: ProductionMetadata;
  status: ReelStatus;
  renderOutput?: VideoRenderOutput;
  outputVideoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateReelPlanInput {
  targetProductId?: string;
  productId?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  platform?: string;
  format?: string;
  customGuidance?: string;
  voiceStyleOverride?: string;
  toneOverride?: string;
}

export interface RegenerateReelPlanInput extends GenerateReelPlanInput {
  regenerateReason?: string;
}

export interface UpdateReelPlanInput {
  title?: string;
  concept?: Partial<ReelConcept>;
  targetProductId?: string | null;
  productId?: string | null;
  targetProduct?: string | null;
  objective?: string;
  audience?: string;
  funnelStage?: string;
  contentPillar?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  platform?: string;
  format?: string;
  hook?: Partial<Hook>;
  narrative?: string;
  script?: ScriptSegment[];
  scenes?: ReelScene[];
  visualDirection?: Partial<VisualDirection>;
  voiceDirection?: Partial<VoiceDirection>;
  captionDirection?: Partial<CaptionDirection>;
  animationDirection?: Partial<AnimationDirection>;
  audioDirection?: Partial<AudioDirection>;
  cta?: Partial<ReelCTA>;
  productionMetadata?: Partial<ProductionMetadata>;
  status?: ReelStatus;
}

export interface UpdateReelStatusInput {
  status: ReelStatus;
}

export interface RegenerateSceneInput {
  sceneNumber: number;
  customGuidance?: string;
}

export interface BatchGenerateReelsInput {
  jobIds?: string[];
  customGuidance?: string;
}

export interface BatchGenerateReelsResult {
  planId: string;
  enqueuedJobs: number;
  eligibleJobIds: string[];
  skippedJobIds: string[];
}

// Queue Job Domain for Reel Orchestration
export interface ReelOrchestrationJobPayload {
  id: string;
  action: 'GENERATE_REEL_PLAN' | 'REGENERATE_REEL_PLAN';
  contentJobId: string;
  brandId: string;
  workspaceId: string;
  input?: GenerateReelPlanInput | RegenerateReelPlanInput;
  triggeredBy?: string;
  timestamp: number;
}

export interface ReelOrchestrationJobResult {
  jobId: string;
  contentJobId: string;
  reelPlanId: string;
  version: number;
  status: 'completed' | 'failed';
  processedAt: string;
}

// ====================================================
// Phase 6: Media + Voice + Captions + Audio Domain
// ====================================================


// --- Reel Asset Domain ---
export type ReelAssetType =
  | 'VIDEO'
  | 'IMAGE'
  | 'LOGO'
  | 'PRODUCT_IMAGE'
  | 'PRODUCT_VIDEO'
  | 'MUSIC'
  | 'SFX'
  | 'VOICE'
  | 'CAPTION';

export type ReelAssetSourceType =
  | 'BRAND_LIBRARY'
  | 'PEXELS'
  | 'LOCAL_GALLERY'
  | 'GENERATED'
  | 'EXTERNAL';

export type ReelAssetStatus =
  | 'DISCOVERED'
  | 'SELECTED'
  | 'DOWNLOADING'
  | 'READY'
  | 'FAILED'
  | 'REJECTED';

export interface ReelAssetMetadata extends Record<string, unknown> {
  isPlaceholder?: boolean;
  isTestAsset?: boolean;
  productId?: string | null;
  assetPurpose?: string;
  sourceType?: string;
  productionEligible?: boolean;
  matchScore?: number;
  rationale?: string;
  scenePurpose?: string;
  isFirstParty?: boolean;
  [key: string]: unknown;
}

export type ProductionErrorCode =
  | 'PRODUCT_ASSET_REQUIRED'
  | 'PRODUCT_MEDIA_REQUIRED'
  | 'PRODUCT_ASSET_INVALID'
  | 'PRODUCT_ASSET_PLACEHOLDER'
  | 'PRODUCT_ASSET_NOT_PRODUCTION_ELIGIBLE'
  | 'MEDIA_ASSET_UNAVAILABLE'
  | 'MEDIA_ASSET_DOWNLOAD_FAILED'
  | 'RENDER_VISUAL_VALIDATION_FAILED';

export interface ReelAsset {
  id: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  sceneNumber?: number | null;
  assetType: ReelAssetType;
  sourceType: ReelAssetSourceType;
  provider: string;
  providerAssetId?: string | null;
  sourceUrl?: string | null;
  previewUrl?: string | null;
  storageKey?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  isPlaceholder?: boolean;
  isTestAsset?: boolean;
  productId?: string | null;
  assetPurpose?: string;
  productionEligible?: boolean;
  metadata: ReelAssetMetadata;
  licenseMetadata: Record<string, unknown>;
  status: ReelAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

// --- Media Search & Matching Domain ---

export interface MediaRequirement {
  sceneNumber: number;
  purpose: string;
  assetRequirement: string;
  productReference?: string | null;
  brandElement?: string | null;
  visualType: string;
  mood: string;
  subject: string;
  environment: string;
  durationSeconds: number;
}

export interface MediaAssetMatch {
  asset: ReelAsset | MediaAsset;
  score: number;
  matchSource: ReelAssetSourceType;
  rationale: string;
  isFirstParty: boolean;
}

// --- Voice Domain ---
export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  accent?: string;
  language?: string;
  previewAudioUrl?: string;
  provider?: string;
}

export interface VoiceConfiguration {
  voiceId: string;
  voiceName?: string;
  gender?: 'male' | 'female' | 'neutral' | string;
  provider: string;
  style?: string;
  tone?: string;
  pace?: string;
  energy?: string;
  language?: string;
  pronunciationHints?: Record<string, string>;
  pitch?: number;
  speed?: number;
}

export interface VoiceSynthesisResult {
  audioBuffer?: Buffer;
  audioUrl: string;
  storageKey?: string;
  durationSeconds: number;
  format: string;
  sampleRate?: number;
}

export interface VoiceProvider {
  readonly providerName: string;
  getVoices(): Promise<VoiceOption[]>;
  synthesizeSpeech(text: string, config: VoiceConfiguration): Promise<VoiceSynthesisResult>;
  getGenerationStatus?(jobId: string): Promise<string>;
}

// --- Caption Engine Domain ---
export type CaptionStyle =
  | 'STANDARD'
  | 'WORD_HIGHLIGHT'
  | 'KARAOKE'
  | 'EMPHASIS'
  | 'MINIMAL'
  | 'CTA';

export interface CaptionCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  style?: CaptionStyle;
  emphasis?: string | null;
  sceneNumber?: number | null;
}

export interface CaptionStyleConfig {
  fontFamily?: string;
  fontSize?: number;
  primaryColor?: string;
  highlightColor?: string;
  animationStyle?: 'fade' | 'pop' | 'typewriter' | 'karaoke' | 'kinetic';
  position?: 'bottom' | 'center' | 'top';
  maxWordsPerLine?: number;
}

export interface CaptionTrack {
  id: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  version: number;
  cues: CaptionCue[];
  style: CaptionStyleConfig;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Audio, Music & SFX Domain ---
export type AudioSourceOption = 'AI_RECOMMENDED' | 'BRAND_LIBRARY' | 'LOCAL_GALLERY';

export interface MusicSelection {
  source: AudioSourceOption;
  assetId?: string;
  title?: string;
  artist?: string;
  url?: string;
  storageKey?: string;
  mood?: string;
  genre?: string;
  tempoBpm?: number;
  durationSeconds?: number;
  volume: number;
  licenseMetadata?: Record<string, unknown>;
}

export interface SFXSelection {
  id: string;
  assetId?: string;
  name: string;
  type: string;
  source: AudioSourceOption;
  url?: string;
  storageKey?: string;
  startTime: number;
  durationSeconds: number;
  volume: number;
  sceneNumber?: number;
}

export interface AudioMixSettings {
  voiceVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ducking: boolean;
  duckingLevel: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  priorityOrder: string[];
}

export interface AudioMixPlan {
  id: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  voiceConfig: VoiceConfiguration;
  musicConfig: MusicSelection;
  sfxConfigs: SFXSelection[];
  mixSettings: AudioMixSettings;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioPlan {
  voice?: VoiceConfiguration;
  music?: MusicSelection;
  sfx: SFXSelection[];
  mix: AudioMixSettings;
}

// --- Production Readiness & Package Domain ---
export type ReadinessBlockerCode =
  | 'MEDIA_MISSING'
  | 'VOICE_MISSING'
  | 'CAPTIONS_MISSING'
  | 'AUDIO_MISSING'
  | 'BRAND_ASSET_MISSING'
  | 'STORAGE_ERROR'
  | 'PROVIDER_ERROR';

export interface ProductionComponentCheck {
  status: 'READY' | 'MISSING' | 'OPTIONAL' | 'FAILED';
  details?: string;
  assetCount?: number;
}

export interface ProductionReadiness {
  status: 'READY_FOR_ANIMATION' | 'BLOCKED' | 'IN_PROGRESS';
  checks: {
    media: ProductionComponentCheck;
    voice: ProductionComponentCheck;
    captions: ProductionComponentCheck;
    music: ProductionComponentCheck;
    sfx: ProductionComponentCheck;
    brandAssets: ProductionComponentCheck;
  };
  blockers: ReadinessBlockerCode[];
  evaluatedAt: string;
}

export interface ReelProductionPackage {
  id: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  readiness: ProductionReadiness;
  packagePayload: {
    reelPlan: ReelProductionPlan;
    assets: ReelAsset[];
    voiceAsset?: ReelAsset | null;
    captionTrack?: CaptionTrack | null;
    audioMixPlan?: AudioMixPlan | null;
  };
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// --- Phase 6 Queue Payloads ---
export interface MediaResolutionJobPayload {
  id: string;
  action: 'RESOLVE_MEDIA' | 'REGENERATE_MEDIA';
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  sceneNumber?: number;
  timestamp: number;
}

export interface VoiceGenerationJobPayload {
  id: string;
  action: 'GENERATE_VOICE' | 'REGENERATE_VOICE';
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  voiceConfig?: VoiceConfiguration;
  timestamp: number;
}

export interface CaptionGenerationJobPayload {
  id: string;
  action: 'GENERATE_CAPTIONS' | 'REGENERATE_CAPTIONS';
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  style?: CaptionStyleConfig;
  timestamp: number;
}

export interface AudioResolutionJobPayload {
  id: string;
  action: 'RESOLVE_AUDIO' | 'REGENERATE_AUDIO';
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  musicSelection?: Partial<MusicSelection>;
  sfxSelections?: SFXSelection[];
  timestamp: number;
}

// ====================================================
// Phase 7: Advanced Animation Intelligence Domain
// ====================================================

export type AnimationLanguage =
  | 'CINEMATIC'
  | 'PREMIUM'
  | 'ENERGETIC'
  | 'MINIMAL'
  | 'CORPORATE'
  | 'LUXURY'
  | 'PLAYFUL'
  | 'TECH'
  | 'DRAMATIC'
  | 'EDITORIAL'
  | 'SOCIAL_FAST'
  | 'PRODUCT_FOCUSED';

export type AnimationStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'READY'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'FAILED'
  | 'SUPERSEDED';

export type AnimationIntensity = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export type AnimationTarget =
  | 'BACKGROUND'
  | 'MEDIA'
  | 'PRODUCT'
  | 'LOGO'
  | 'TEXT'
  | 'CAPTION'
  | 'CTA'
  | 'OVERLAY'
  | 'ICON'
  | 'SHAPE'
  | 'SCENE';

export type AnimationEventType =
  | 'FADE_IN'
  | 'FADE_OUT'
  | 'SLIDE_IN'
  | 'SLIDE_OUT'
  | 'SCALE_IN'
  | 'SCALE_OUT'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'PAN'
  | 'PARALLAX'
  | 'ROTATE'
  | 'BLUR_IN'
  | 'BLUR_OUT'
  | 'MASK_REVEAL'
  | 'WIPE'
  | 'GLITCH'
  | 'SHAKE'
  | 'BOUNCE'
  | 'SPRING'
  | 'POP'
  | 'GLOW'
  | 'HIGHLIGHT'
  | 'STAGGER'
  | 'TYPE_ON'
  | 'WORD_POP'
  | 'CHARACTER_REVEAL'
  | 'IMAGE_REVEAL'
  | 'PRODUCT_REVEAL'
  | 'LOGO_REVEAL'
  | 'CTA_PULSE';

export type AnimationEasing =
  | 'LINEAR'
  | 'EASE_IN'
  | 'EASE_OUT'
  | 'EASE_IN_OUT'
  | 'CUBIC_IN'
  | 'CUBIC_OUT'
  | 'CUBIC_IN_OUT'
  | 'QUAD_IN'
  | 'QUAD_OUT'
  | 'BACK'
  | 'ELASTIC'
  | 'BOUNCE'
  | 'SPRING';

export type CameraMotionType =
  | 'STATIC'
  | 'SLOW_PUSH'
  | 'SLOW_PULL'
  | 'DYNAMIC_PUSH'
  | 'DYNAMIC_PULL'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'PAN_UP'
  | 'PAN_DOWN'
  | 'PARALLAX'
  | 'ORBIT_INTENT'
  | 'WHIP_INTENT';

export type ProductRevealType =
  | 'CLEAN_REVEAL'
  | 'SLIDE_REVEAL'
  | 'SCALE_REVEAL'
  | 'MASK_REVEAL'
  | 'LIGHT_REVEAL'
  | 'FOCUS_REVEAL'
  | 'HERO_REVEAL'
  | 'DETAIL_REVEAL';

export type LogoAnimationStyle =
  | 'FADE'
  | 'REVEAL'
  | 'SLIDE'
  | 'SCALE'
  | 'MASK'
  | 'LIGHT_SWEEP'
  | 'MINIMAL_MARK';

export type TextEntranceStyle =
  | 'WORD_POP'
  | 'WORD_HIGHLIGHT'
  | 'TYPE_ON'
  | 'SLIDE'
  | 'FADE'
  | 'SCALE'
  | 'STAGGER'
  | 'MASK_REVEAL'
  | 'EMPHASIS_PULSE';

export type TransitionType =
  | 'CUT'
  | 'FADE'
  | 'CROSSFADE'
  | 'SLIDE'
  | 'WIPE'
  | 'ZOOM'
  | 'MATCH_MOVE'
  | 'LIGHT_WIPE'
  | 'BLUR'
  | 'GLITCH'
  | 'WHIP'
  | 'MORPH_INTENT';

export type SyncSource = 'VOICE' | 'MUSIC' | 'SFX';

export type SyncEvent =
  | 'WORD_START'
  | 'WORD_EMPHASIS'
  | 'BEAT'
  | 'SFX_HIT'
  | 'CTA'
  | 'SCENE_START'
  | 'SCENE_END';

export type AnimationMode =
  | 'SOCIAL_REEL'
  | 'BRAND_PROMOTION'
  | 'PRODUCT_PROMOTION'
  | 'EDUCATIONAL'
  | 'STORYTELLING'
  | 'ANNOUNCEMENT';

export interface GlobalAnimationSettings {
  animationLanguage: AnimationLanguage;
  intensity: AnimationIntensity;
  pacing: string;
  smoothness: number; // 0 to 1
  defaultEasing: AnimationEasing;
  defaultTransition: TransitionType;
  motionBlurIntent: boolean;
  maxSimultaneousAnimations: number;
  reducedMotionSupport: boolean;
  mode?: AnimationMode;
}

export interface AnimationEvent {
  id: string;
  type: AnimationEventType;
  target: AnimationTarget;
  startTime: number;
  duration: number;
  easing: AnimationEasing;
  intensity: AnimationIntensity;
  parameters: Record<string, unknown>;
  trigger?: string;
  layer: number; // z-index / layer ordering (1 = lowest)
  priority: number; // 1 to 10
}

export interface CameraMotion {
  type: CameraMotionType;
  startTime: number;
  duration: number;
  intensity: AnimationIntensity;
  direction?: 'IN' | 'OUT' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
  focalPoint?: { x: number; y: number };
  scale?: number;
  easing: AnimationEasing;
}

export interface ProductAnimation {
  productId?: string;
  revealType: ProductRevealType;
  startTime: number;
  duration: number;
  emphasis: boolean;
  isHeroMoment?: boolean;
  scaleIntent?: number;
  positionIntent?: string;
  highlightIntent?: boolean;
  backgroundTreatment?: string;
}

export interface LogoAnimation {
  assetId?: string;
  startTime: number;
  duration: number;
  style: LogoAnimationStyle;
  scale?: number;
  position?: 'top-left' | 'top-right' | 'center' | 'bottom-center' | 'bottom-right';
  opacity?: number;
  easing: AnimationEasing;
}

export interface TextAnimation {
  targetText: string;
  startTime: number;
  duration: number;
  entrance: TextEntranceStyle;
  emphasis?: string;
  exit?: string;
  easing: AnimationEasing;
  stagger?: number;
  emphasisWords: string[];
}

export interface TransitionPlan {
  fromScene: number;
  toScene: number;
  type: TransitionType;
  duration: number;
  easing: AnimationEasing;
  intensity: AnimationIntensity;
  rationale?: string;
}

export interface SyncCue {
  time: number;
  source: SyncSource;
  event: SyncEvent;
  target: AnimationTarget;
  strength: number; // 0 to 1
  label?: string;
}

export interface SceneAnimation {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  animationIntensity: AnimationIntensity;
  entranceAnimations: AnimationEvent[];
  continuousAnimations: AnimationEvent[];
  emphasisAnimations: AnimationEvent[];
  exitAnimations: AnimationEvent[];
  cameraMotion: CameraMotion[];
  textMotion: TextAnimation[];
  mediaMotion: AnimationEvent[];
  productMotion: ProductAnimation[];
  logoMotion: LogoAnimation[];
  synchronizationCues: SyncCue[];
  transitionOut?: TransitionPlan;
  rationale: string;
}

export interface VisualRhythmPlan {
  sceneIntensity: Record<number, AnimationIntensity>;
  motionDensity: Record<number, 'LOW' | 'MEDIUM' | 'HIGH'>;
  transitionDensity: string;
  emphasisMoments: Array<{
    sceneNumber: number;
    timestamp: number;
    description: string;
    target: AnimationTarget;
  }>;
}

export interface AnimationPlanMetadata {
  generatedBy: string;
  generatedAt: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  brandDnaVersion?: number;
  campaignMode?: AnimationMode;
  targetDurationSeconds?: number;
  totalEventsCount?: number;
  rhythm?: VisualRhythmPlan;
  sceneCount?: number;
}

export interface AnimationPlan {
  id: string;
  workspaceId: string;
  brandId: string;
  reelPlanId: string;
  productionPackageId: string;
  version: number;
  status: AnimationStatus;
  animationLanguage: AnimationLanguage;
  globalSettings: GlobalAnimationSettings;
  sceneAnimations: SceneAnimation[];
  transitionPlan: TransitionPlan[];
  textAnimationPlan: TextAnimation[];
  cameraPlan: CameraMotion[];
  productAnimationPlan: ProductAnimation[];
  logoAnimationPlan: LogoAnimation[];
  syncPlan: SyncCue[];
  metadata: AnimationPlanMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type AnimationBlockerCode =
  | 'MISSING_SCENE_ANIMATION'
  | 'INVALID_TIMING'
  | 'MISSING_MEDIA_REFERENCE'
  | 'MISSING_CAPTION_REFERENCE'
  | 'MISSING_AUDIO_SYNC'
  | 'INVALID_TRANSITION'
  | 'ANIMATION_CONFLICT';

export interface AnimationReadinessReport {
  score: number; // 0 to 100
  status: 'READY' | 'NEEDS_REVIEW' | 'NOT_READY';
  blockers: AnimationBlockerCode[];
  warnings: string[];
  sceneCoverage: number; // 0 to 100
  syncCoverage: number; // 0 to 100
  assetCoverage: number; // 0 to 100
  validationErrors: string[];
  evaluatedAt: string;
}

export interface AnimationRenderContract {
  contractVersion: string;
  reelPlanId: string;
  productionPackageId: string;
  animationPlanId: string;
  dimensions: {
    width: number;
    height: number;
    aspectRatio: string;
  };
  fps: number;
  totalDurationSeconds: number;
  scenes: Array<{
    sceneNumber: number;
    startTime: number;
    endTime: number;
    duration: number;
    mediaUrl?: string;
    mediaType?: string;
    camera: CameraMotion[];
    animations: AnimationEvent[];
    textAnimations: TextAnimation[];
    productAnimations: ProductAnimation[];
    logoAnimations: LogoAnimation[];
    transitionOut?: TransitionPlan;
    syncCues: SyncCue[];
  }>;
  audio: {
    voiceTrackUrl?: string;
    musicTrackUrl?: string;
    sfxCues: SFXSelection[];
    duckingConfig?: unknown;
  };
  captions: {
    trackId?: string;
    cuesCount: number;
    style: CaptionStyleConfig;
  };
  brand: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
  };
  globalSettings: GlobalAnimationSettings;
}

export interface GenerateAnimationPlanInput {
  animationLanguage?: AnimationLanguage;
  intensity?: AnimationIntensity;
  mode?: AnimationMode;
  reducedMotion?: boolean;
  customGuidance?: string;
}

export interface RegenerateAnimationPlanInput extends GenerateAnimationPlanInput {
  regenerateReason?: string;
}

export interface UpdateAnimationPlanInput {
  status?: AnimationStatus;
  animationLanguage?: AnimationLanguage;
  globalSettings?: Partial<GlobalAnimationSettings>;
  sceneAnimations?: SceneAnimation[];
  transitionPlan?: TransitionPlan[];
  textAnimationPlan?: TextAnimation[];
  cameraPlan?: CameraMotion[];
  productAnimationPlan?: ProductAnimation[];
  logoAnimationPlan?: LogoAnimation[];
  syncPlan?: SyncCue[];
  metadata?: Partial<AnimationPlanMetadata>;
}

export interface UpdateAnimationStatusInput {
  status: AnimationStatus;
}

export interface RegenerateSceneAnimationInput {
  sceneNumber: number;
  customGuidance?: string;
  intensity?: AnimationIntensity;
}

// Queue Job Domain for Animation Intelligence
export interface AnimationJobPayload {
  id: string;
  action: 'GENERATE_ANIMATION_PLAN' | 'REGENERATE_ANIMATION_PLAN' | 'REGENERATE_SCENE_ANIMATION' | 'VALIDATE_ANIMATION_PLAN';
  reelPlanId: string;
  productionPackageId: string;
  workspaceId: string;
  brandId: string;
  sceneNumber?: number;
  input?: GenerateAnimationPlanInput | RegenerateAnimationPlanInput | RegenerateSceneAnimationInput;
  triggeredBy?: string;
  timestamp: number;
}

export interface AnimationJobResult {
  jobId: string;
  reelPlanId: string;
  animationPlanId: string;
  version: number;
  status: 'completed' | 'failed';
  readinessScore: number;
  processedAt: string;
}

// Queue Job Domain for Video Rendering Engine (Phase 8)
export interface RenderJobPayload {
  id: string;
  action: 'RENDER_REEL_VIDEO';
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  triggeredBy?: string;
  timestamp: number;
}

export interface RenderJobResult {
  jobId: string;
  reelPlanId: string;
  status: 'completed' | 'failed';
  outputVideoUrl?: string;
  durationSeconds?: number;
  processedAt: string;
  error?: string;
}

// ====================================================
// Phase 9: Automated Delivery, Publishing & Production Workflow
// ====================================================

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRecord {
  status: ApprovalStatus;
  reason?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
}

export type PublishingPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE' | 'TIKTOK' | 'MOCK';

export type PublishingStatus = 'PENDING' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface SocialPublicationRecord {
  id: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  platform: PublishingPlatform;
  status: PublishingStatus;
  scheduledAt?: string;
  publishedAt?: string;
  externalPostId?: string;
  externalUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  attemptCount: number;
  payload?: {
    caption?: string;
    hashtags?: string[];
    mediaUrl?: string;
    title?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishReelPayload {
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  platform: PublishingPlatform;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  title?: string;
  coverImageUrl?: string;
  scheduledTime?: string;
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  externalUrl?: string;
  platform: PublishingPlatform;
  publishedAt: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface SocialPublisher {
  readonly platform: PublishingPlatform;
  publishReel(payload: PublishReelPayload): Promise<PublishResult>;
  validateCredentials(workspaceId: string): Promise<boolean>;
  getPublishingStatus(externalPostId: string): Promise<{ status: PublishingStatus; url?: string }>;
  deletePublishedPost(externalPostId: string): Promise<boolean>;
}

export interface SocialPublishJobPayload {
  id: string;
  action: 'PUBLISH_REEL' | 'SCHEDULE_REEL';
  publicationId: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  platform: PublishingPlatform;
  scheduledAt?: string;
  timestamp: number;
}

export interface SocialPublishJobResult {
  jobId: string;
  publicationId: string;
  reelPlanId: string;
  status: 'completed' | 'failed';
  externalPostId?: string;
  externalUrl?: string;
  processedAt: string;
  error?: string;
}

export interface BulkCampaignJobPayload {
  id: string;
  action: 'GENERATE_CAMPAIGN_REELS';
  campaignId: string;
  contentPlanId: string;
  workspaceId: string;
  brandId: string;
  autoApprove?: boolean;
  autoSchedule?: boolean;
  timestamp: number;
}

export interface BulkCampaignJobResult {
  jobId: string;
  campaignId: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  status: 'completed' | 'failed';
  processedAt: string;
}

export interface ApproveReelInput {
  approvedBy?: string;
  notes?: string;
}

export interface RejectReelInput {
  reason: string;
  rejectedBy?: string;
}

export interface ScheduleReelInput {
  platform: PublishingPlatform;
  scheduledAt: string;
  timezone?: string;
  customCaption?: string;
  customHashtags?: string[];
}

// ====================================================
// Phase 10: Meta Ads Integration Domain
// ====================================================

export type MetaConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';

export interface MetaAdAccount {
  id: string;
  name: string;
  accountId: string;
  currency: string;
  accountStatus: number;
  businessName?: string;
}

export interface MetaPage {
  id: string;
  name: string;
  category?: string;
  accessToken?: string;
  instagramActorId?: string;
}

export interface MetaConnectionRecord {
  id: string;
  workspaceId: string;
  metaUserId: string;
  metaUserName: string;
  accessToken?: string;
  tokenExpiresAt?: Date;
  adAccounts: MetaAdAccount[];
  pages: MetaPage[];
  selectedAdAccountId?: string;
  selectedPageId?: string;
  selectedInstagramActorId?: string;
  status: MetaConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaConnectionSanitized {
  id: string;
  workspaceId: string;
  metaUserId: string;
  metaUserName: string;
  tokenExpiresAt?: string;
  adAccounts: MetaAdAccount[];
  pages: MetaPage[];
  selectedAdAccountId?: string;
  selectedPageId?: string;
  selectedInstagramActorId?: string;
  status: MetaConnectionStatus;
  hasValidToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MetaAdObjective =
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_APP_PROMOTION';

export type MetaBuyingType = 'AUCTION';

export type MetaBillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS';

export type MetaOptimizationGoal =
  | 'LINK_CLICKS'
  | 'LANDING_PAGE_VIEWS'
  | 'IMPRESSIONS'
  | 'REACH'
  | 'POST_ENGAGEMENT'
  | 'OFFSITE_CONVERSIONS';

export type MetaAdCallToActionType =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'WATCH_MORE'
  | 'ORDER_NOW'
  | 'GET_OFFER'
  | 'BOOK_TRAVEL'
  | 'APPLY_NOW';

export interface MetaTargetingSpec {
  geoLocations?: {
    countries?: string[];
    regions?: Array<{ key: string; name?: string }>;
    cities?: Array<{ key: string; name?: string }>;
  };
  ageMin?: number;
  ageMax?: number;
  genders?: number[]; // 1 = Male, 2 = Female, undefined = All
  interests?: Array<{ id: string; name: string }>;
  publisherPlatforms?: Array<'facebook' | 'instagram' | 'audience_network' | 'messenger'>;
  facebookPositions?: string[];
  instagramPositions?: string[];
  devicePlatforms?: Array<'mobile' | 'desktop'>;
}

export interface MetaAdCampaignRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string | null;
  metaAdAccountId: string;
  externalCampaignId: string;
  name: string;
  objective: MetaAdObjective;
  buyingType: MetaBuyingType;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  dailyBudget?: number;
  lifetimeBudget?: number;
  specialAdCategories: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaAdSetRecord {
  id: string;
  workspaceId: string;
  metaAdCampaignId: string;
  externalAdSetId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  billingEvent: MetaBillingEvent;
  optimizationGoal: MetaOptimizationGoal;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting: MetaTargetingSpec;
  startTime?: string;
  endTime?: string;
  promotedObject?: Record<string, unknown>;
  bidAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaAdCreativeRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  reelPlanId: string;
  externalCreativeId: string;
  externalVideoId?: string;
  name: string;
  title: string;
  body: string;
  videoUrl: string;
  thumbnailUrl?: string;
  callToActionType: MetaAdCallToActionType;
  destinationUrl: string;
  linkCaption?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaAdRecord {
  id: string;
  workspaceId: string;
  metaAdSetId: string;
  metaAdCreativeId: string;
  reelPlanId: string;
  externalAdId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  trackingSpecs?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type MetaAdPublicationStatus = 'PENDING' | 'PREPARING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export interface MetaAdPublicationRecord {
  id: string;
  workspaceId: string;
  reelPlanId: string;
  brandId: string;
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaCreativeId?: string;
  metaAdId?: string;
  externalCampaignId?: string;
  externalAdSetId?: string;
  externalCreativeId?: string;
  externalAdId?: string;
  status: MetaAdPublicationStatus;
  idempotencyKey: string;
  attemptCount: number;
  errorCode?: string;
  errorMessage?: string;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrepareMetaAdCreativeInput {
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  title?: string;
  body?: string;
  callToActionType?: MetaAdCallToActionType;
  destinationUrl?: string;
  linkCaption?: string;
}

export interface PublishMetaAdInput {
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string;
  metaAdAccountId?: string;
  metaCampaignName?: string;
  metaCampaignObjective?: MetaAdObjective;
  dailyBudget?: number;
  lifetimeBudget?: number;
  metaAdSetName?: string;
  targeting?: MetaTargetingSpec;
  primaryText?: string;
  headline?: string;
  callToActionType?: MetaAdCallToActionType;
  destinationUrl?: string;
  idempotencyKey?: string;
}

export interface MetaAdPublishResult {
  success: boolean;
  publicationId: string;
  reelPlanId: string;
  workspaceId: string;
  campaignId?: string;
  externalCampaignId?: string;
  adSetId?: string;
  externalAdSetId?: string;
  creativeId?: string;
  externalCreativeId?: string;
  adId?: string;
  externalAdId?: string;
  adsManagerUrl?: string;
  status: MetaAdPublicationStatus;
  publishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface MetaAdsPublishJobPayload {
  id: string;
  action: 'PUBLISH_META_AD';
  publicationId: string;
  reelPlanId: string;
  workspaceId: string;
  brandId: string;
  publishPayload: PublishMetaAdInput;
  timestamp: number;
}

export interface MetaAdsPublishJobResult {
  jobId: string;
  publicationId: string;
  reelPlanId: string;
  status: 'completed' | 'failed';
  externalAdId?: string;
  adsManagerUrl?: string;
  processedAt: string;
  error?: string;
}

// ==========================================
// Phase 11: Analytics & AI Optimization Engine
// ==========================================

export interface NormalizedPerformanceMetrics {
  impressions?: number | null;
  reach?: number | null;
  videoViews?: number | null;
  videoViews3s?: number | null;
  videoViewsThruplay?: number | null;
  watchTimeSeconds?: number | null;
  averageWatchTimeSeconds?: number | null;
  completionRate?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  linkClicks?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  spend?: number | null;
  conversions?: number | null;
  conversionValue?: number | null;
  purchases?: number | null;
  revenue?: number | null;
  roas?: number | null;
  cpa?: number | null;
  engagementRate?: number | null;
}

export interface PerformanceSnapshotRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  marketingCampaignId?: string | null;
  reelId?: string | null;
  publicationId?: string | null;
  platform: string;
  externalCampaignId?: string | null;
  externalAdSetId?: string | null;
  externalAdId?: string | null;
  externalPostId?: string | null;
  collectedAt: Date;
  reportingWindowStart?: Date | null;
  reportingWindowEnd?: Date | null;
  impressions?: number | null;
  reach?: number | null;
  videoViews?: number | null;
  videoViews3s?: number | null;
  videoViewsThruplay?: number | null;
  watchTimeSeconds?: number | null;
  averageWatchTimeSeconds?: number | null;
  completionRate?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
  linkClicks?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  spend?: number | null;
  conversions?: number | null;
  conversionValue?: number | null;
  purchases?: number | null;
  revenue?: number | null;
  rawPayload?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceMetricHistoryRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  reelId?: string | null;
  externalCampaignId?: string | null;
  externalAdSetId?: string | null;
  externalAdId?: string | null;
  platform: string;
  timestamp: Date;
  metricPayload: Record<string, unknown>;
  createdAt: Date;
}

export type PerformanceTier = 'TIER_1_TOP' | 'TIER_2_HIGH' | 'TIER_3_AVERAGE' | 'TIER_4_UNDERPERFORMING';

export interface ContentPerformanceAnalysisRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  reelId: string;
  analyzedAt: Date;
  performanceTier: PerformanceTier;
  hookScore: number;
  retentionScore: number;
  engagementScore: number;
  conversionScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  detectedPatterns: {
    hookStyle?: string;
    messagingAngle?: string;
    ctaType?: string;
    durationBucket?: string;
    visualIntensity?: string;
    [key: string]: unknown;
  };
  metricSummary: NormalizedPerformanceMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export type OptimizationInsightType =
  | 'HOOK'
  | 'CONTENT_ANGLE'
  | 'CTA'
  | 'OFFER'
  | 'AUDIENCE'
  | 'TIMING'
  | 'FORMAT'
  | 'CAPTION'
  | 'CREATIVE'
  | 'BUDGET'
  | 'PLACEMENT'
  | 'GENERAL';

export type OptimizationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type OptimizationStatus = 'PENDING' | 'APPLIED' | 'DISMISSED';

export interface OptimizationInsightRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  sourceReelId?: string | null;
  sourceCampaignId?: string | null;
  type: OptimizationInsightType;
  priority: OptimizationPriority;
  title: string;
  recommendation: string;
  reasoning: string;
  evidence: {
    metrics?: Record<string, unknown>;
    sourceContentId?: string;
    sourceContentTitle?: string;
    comparativeLift?: string;
    sampleSize?: number;
    [key: string]: unknown;
  };
  expectedImpact: string;
  status: OptimizationStatus;
  createdAt: Date;
  expiresAt?: Date | null;
}

export interface OptimizationLearningRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  patternType: string;
  patternKey: string;
  sampleSize: number;
  confidenceScore: number;
  summary: string;
  evidenceReferences: Array<{
    reelId?: string;
    metric?: string;
    value?: number;
  }>;
  recommendations: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ExperimentType = 'HOOK' | 'CTA' | 'CAPTION' | 'CREATIVE' | 'OFFER';
export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'INCONCLUSIVE';

export interface ExperimentVariant {
  label: string;
  reelId?: string;
  content: Record<string, unknown>;
  impressions?: number;
  conversions?: number;
  clicks?: number;
  videoViews?: number;
  metricValue?: number;
}

export interface ExperimentRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  name: string;
  experimentType: ExperimentType;
  status: ExperimentStatus;
  variantA: ExperimentVariant;
  variantB: ExperimentVariant;
  targetMetric: string;
  sampleSizeA: number;
  sampleSizeB: number;
  confidenceScore?: number | null;
  winningVariant?: 'A' | 'B' | 'INCONCLUSIVE' | null;
  resultSummary?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationContext {
  winningHooks?: string[];
  weakHooks?: string[];
  winningMessagingAngles?: string[];
  weakMessagingAngles?: string[];
  winningCTAs?: string[];
  weakCTAs?: string[];
  winningContentPillars?: string[];
  weakContentPillars?: string[];
  winningVisualStyles?: string[];
  weakVisualStyles?: string[];
  recommendedDurations?: number[];
  recommendedFormats?: string[];
  patternsToAvoid?: string[];
  experimentOutcomes?: Array<{
    name: string;
    experimentType: string;
    winningVariant?: string | null;
    resultSummary?: string | null;
    confidenceScore?: number | null;
  }>;
  verifiedPerformanceData?: Array<{
    metric: string;
    value: number | string;
    context: string;
  }>;
  aiRecommendations?: Array<{
    recommendation: string;
    reason: string;
    expectedImpact: string;
  }>;
  topInsights?: Array<{
    type: OptimizationInsightType;
    title: string;
    recommendation: string;
    reasoning: string;
    evidenceText?: string;
  }>;
}

export interface WinningPattern {
  type: string;
  key: string;
  evidence: string;
  metricLift: string;
}

export interface UnderperformingPattern {
  type: string;
  key: string;
  evidence: string;
  metricDrag: string;
}

export interface RecommendationItem {
  id?: string;
  type: OptimizationInsightType;
  priority: OptimizationPriority;
  title: string;
  recommendation: string;
  reason: string;
  supportingMetrics: Record<string, unknown>;
  sourceContent?: string;
  confidence: number;
  expectedImpact: string;
  implementationGuidance: string;
}

export interface FutureContentGuidance {
  recommendedHooks: string[];
  recommendedMessagingAngles: string[];
  recommendedCTAs: string[];
  recommendedContentPillars: string[];
  recommendedDurations: number[];
  recommendedFormats: string[];
  patternsToAvoid: string[];
}

export interface ExperimentSuggestion {
  hypothesis: string;
  type: ExperimentType;
  variantA: string;
  variantB: string;
  targetMetric: string;
  expectedOutcome: string;
}

export interface AIOptimizationOutput {
  summary: string;
  winningPatterns: WinningPattern[];
  underperformingPatterns: UnderperformingPattern[];
  recommendations: RecommendationItem[];
  nextContentGuidance: FutureContentGuidance;
  experimentSuggestions: ExperimentSuggestion[];
}

export interface AnalyticsOverviewSummary {
  totalSpend: number | null;
  totalReach: number | null;
  totalImpressions: number | null;
  totalVideoViews: number | null;
  averageEngagementRate: number | null;
  averageCtr: number | null;
  totalConversions: number | null;
  totalRevenue: number | null;
  overallRoas: number | null;
  snapshotCount: number;
  lastSyncedAt?: string | null;
}

export interface AnalyticsSyncJobPayload {
  id: string;
  action: 'SYNC_WORKSPACE' | 'SYNC_BRAND' | 'SYNC_CAMPAIGN' | 'SYNC_REEL' | 'BACKFILL_HISTORY';
  workspaceId: string;
  brandId?: string;
  campaignId?: string;
  reelId?: string;
  timestamp: number;
}

export interface AnalyticsSyncJobResult {
  jobId: string;
  workspaceId: string;
  brandId?: string;
  status: 'completed' | 'failed';
  snapshotsIngested: number;
  analysesComputed: number;
  insightsGenerated: number;
  processedAt: string;
  error?: string;
}

// ==========================================
// Phase 12: Autonomous Campaign Optimization & Execution Engine
// ==========================================

export type OptimizationActionType =
  | 'CHANGE_HOOK'
  | 'CHANGE_MESSAGING_ANGLE'
  | 'CHANGE_CTA'
  | 'CHANGE_CONTENT_PILLAR'
  | 'CHANGE_DURATION'
  | 'CHANGE_VISUAL_STYLE'
  | 'CREATE_VARIANT'
  | 'RECOMMEND_AUDIENCE_CHANGE'
  | 'RECOMMEND_PLACEMENT_CHANGE'
  | 'RECOMMEND_BUDGET_CHANGE'
  | 'PAUSE_RECOMMENDATION'
  | 'REPLACE_CREATIVE';

export type OptimizationActionStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'FAILED';

export interface OptimizationActionRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string | null;
  reelId?: string | null;
  actionType: OptimizationActionType;
  targetEntity: string;
  reason: string;
  evidence: string | Record<string, unknown>;
  confidence: number;
  expectedImpact: string;
  sourceMetrics?: Record<string, unknown> | null;
  status: OptimizationActionStatus;
  appliedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationExecutionHistoryRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  actionId: string;
  executedBy: string;
  executionStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  executionResult?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CampaignDirectorRunRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string | null;
  summary: string;
  winningPatterns: string[] | Array<{ type: string; key: string; lift: string; evidence: string }>;
  weakPatterns: string[] | Array<{ type: string; key: string; drag: string; evidence: string }>;
  strategicDirectives: string[] | Array<{ directive: string; priority: string; rationale: string }>;
  contentRequirements: Array<{
    pillar: string;
    angle?: string;
    hookStyle?: string;
    messagingAngle?: string;
    cta?: string;
    suggestedCTA?: string;
    duration?: number;
    suggestedDurationSeconds?: number;
    recommendedHookType?: string;
    priority?: string;
    format?: string;
  }>;
  proposedActionIds: string[];
  createdAt: Date;
}

export interface CampaignDirectorOutput {
  summary: string;
  winningPatterns: string[] | Array<{ type: string; key: string; lift: string; evidence: string }>;
  weakPatterns: string[] | Array<{ type: string; key: string; drag: string; evidence: string }>;
  strategicDirectives: string[] | Array<{ directive: string; priority: string; rationale: string }>;
  contentRequirements: Array<{
    pillar: string;
    angle?: string;
    hookStyle?: string;
    messagingAngle?: string;
    cta?: string;
    suggestedCTA?: string;
    duration?: number;
    suggestedDurationSeconds?: number;
    recommendedHookType?: string;
    priority?: string;
    format?: string;
  }>;
  proposedActions: Array<{
    actionType: OptimizationActionType;
    targetEntity: string;
    reason: string;
    evidence: string;
    confidence: number;
    expectedImpact: string;
    sourceMetrics?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  }>;
}

export interface AutonomousLoopInput {
  workspaceId?: string;
  brandId: string;
  campaignId?: string | null;
  daysToPlan?: number;
  contentPlanDurationDays?: number;
  generateBlueprints?: boolean;
  renderVideos?: boolean;
  autoRenderToApproval?: boolean;
  stopAtApprovalGateway?: boolean;
}

export interface AutonomousLoopResult {
  success?: boolean;
  runId?: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string | null;
  campaignDirectorRunId?: string;
  proposedActionIds?: string[];
  contentPlanId?: string;
  createdReelId?: string;
  renderJob?: Record<string, unknown>;
  strategicDirectivesCount?: number;
  proposedActionsCount?: number;
  reelPlansGeneratedCount?: number;
  reelsRenderedCount?: number;
  status?: string;
  approvalRequired?: boolean;
  approvalRequiredNotice?: string;
  publishingStatus?: string;
  summary?: string;
  processedAt?: string;
}

export interface OptimizationExecutionJobPayload {
  id: string;
  action: 'APPLY_OPTIMIZATION_ACTION';
  workspaceId: string;
  actionId: string;
  executedBy: string;
  timestamp: number;
}

export interface OptimizationExecutionJobResult {
  jobId: string;
  workspaceId: string;
  actionId: string;
  status: 'completed' | 'failed';
  processedAt: string;
  error?: string;
}

// ==========================================
// Phase 13: Autonomous Operations Domain
// ==========================================

export type AutonomousOperatingMode = 'AUTONOMOUS' | 'CONTROLLED';

export type AutonomousPolicyStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED';

export interface AutonomousAdvertisingPolicy {
  enabled: boolean;
  maxDailySpend: number;
  maxCampaignSpend: number;
  maxCampaignsPerDay: number;
  maxNewAdsPerDay: number;
}

export interface AutonomousContentPolicy {
  maxReelsPerDay: number;
  maxReelsPerCampaign: number;
}

export interface AutonomousOptimizationPolicy {
  autoApply: boolean;
  allowedActions: string[];
}

export interface AutonomousTargetingPolicy {
  allowedCountries: string[];
  allowedAgeRange: {
    min?: number;
    max?: number;
  };
  allowedPlacements: string[];
}

export interface AutonomousBrandPolicy {
  enforceBrandRules: boolean;
  enforceBrandColors: boolean;
  enforceApprovedAssets: boolean;
}

export interface AutonomousPolicy {
  id: string;
  workspaceId: string;
  mode: AutonomousOperatingMode;
  status: AutonomousPolicyStatus;
  advertising: AutonomousAdvertisingPolicy;
  content: AutonomousContentPolicy;
  optimization: AutonomousOptimizationPolicy;
  targeting: AutonomousTargetingPolicy;
  brand: AutonomousBrandPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export type AutonomousTriggerType = 'SCHEDULED' | 'MANUAL' | 'EVENT' | 'OPTIMIZATION_TRIGGER';

export type AutonomousRunStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'STOPPED_AT_APPROVAL'
  | 'APPROVAL_REQUIRED'
  | 'WAITING_FOR_ASSET'
  | 'WAITING_FOR_PROVIDER'
  | 'RENDER_FAILED'
  | 'BLOCKED'
  | 'SAFETY_BLOCKED'
  | 'LIMIT_REACHED'
  | 'FAILED'
  | 'PUBLISH';

export type AutonomousRunStepName =
  | 'ANALYTICS_SYNC'
  | 'DIRECTOR_EVALUATION'
  | 'OPTIMIZATION_APPLY'
  | 'CONTENT_PLAN_GENERATION'
  | 'PRODUCT_SELECTION'
  | 'BLUEPRINT_GENERATION'
  | 'PRODUCT_ASSET_VALIDATION'
  | 'VEO_SCENE_GENERATION'
  | 'VEO_POLLING'
  | 'VOICE_GENERATION'
  | 'CAPTION_GENERATION'
  | 'AUDIO_RESOLUTION'
  | 'PRODUCTION_PACKAGE'
  | 'ANIMATION_INTELLIGENCE'
  | 'VIDEO_ASSEMBLY'
  | 'VIDEO_RENDERING'
  | 'VIDEO_QA'
  | 'BRAND_SAFETY'
  | 'BRAND_SAFETY_CHECK'
  | 'COMMERCIAL_CLAIM_VALIDATION'
  | 'APPROVAL'
  | 'BUDGET_GUARDRAILS_CHECK'
  | 'META_PUBLISHING'
  | 'PUBLISH'
  | 'LEARNING'
  | 'AUDIT_RECORDING';

export type AutonomousRunStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SKIPPED' | 'FAILED';

export interface AutonomousRunStep {
  id: string;
  runId: string;
  workspaceId: string;
  stepName: AutonomousRunStepName | string;
  status: AutonomousRunStepStatus;
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface AutonomousRun {
  id: string;
  workspaceId: string;
  brandId: string;
  campaignId?: string | null;
  triggerType: AutonomousTriggerType;
  status: AutonomousRunStatus;
  currentStep?: string;
  policySnapshot?: AutonomousPolicy;
  summary?: string;
  details?: Record<string, unknown>;
  error?: string;
  idempotencyKey?: string;
  steps?: AutonomousRunStep[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AutonomousExecutionActionType =
  | 'OPTIMIZATION_APPLY'
  | 'CONTENT_GENERATION'
  | 'REEL_RENDER'
  | 'META_CAMPAIGN_CREATE'
  | 'META_PUBLISH'
  | 'EMERGENCY_PAUSE'
  | 'LIMIT_CHANGE'
  | 'MODE_CHANGE'
  | 'POLICY_UPDATE';

export interface AutonomousExecutionHistoryRecord {
  id: string;
  workspaceId: string;
  brandId: string;
  runId?: string | null;
  actionType: AutonomousExecutionActionType | string;
  targetEntity: string;
  targetId?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
  reason: string;
  budgetImpact: number;
  executionResult?: Record<string, unknown>;
  errorInformation?: string;
  idempotencyKey?: string;
  executedBy: string;
  createdAt: Date;
}

export interface AutonomousLimitsTracking {
  id: string;
  workspaceId: string;
  date: string;
  dailySpend: number;
  campaignsCreated: number;
  adsCreated: number;
  reelsCreated: number;
  reelsRendered: number;
  reelsPublished: number;
  optimizationsApplied: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AutonomousBudgetEventType =
  | 'SPEND_AUTHORIZED'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'CAMPAIGN_LIMIT_EXCEEDED'
  | 'THRESHOLD_WARNING'
  | 'BUDGET_PAUSED';

export interface AutonomousBudgetEvent {
  id: string;
  workspaceId: string;
  brandId: string;
  eventType: AutonomousBudgetEventType | string;
  amount: number;
  limitValue: number;
  currentValue: number;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type AutonomousSafetySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AutonomousSafetyEventType =
  | 'BUDGET_LIMIT_REACHED'
  | 'BRAND_SAFETY_REJECTION'
  | 'META_TOKEN_EXPIRED'
  | 'META_API_FAILURE'
  | 'INSUFFICIENT_SAMPLE_SIZE'
  | 'EMERGENCY_PAUSE_TRIGGERED'
  | 'POLICY_VIOLATION';

export interface AutonomousSafetyEvent {
  id: string;
  workspaceId: string;
  brandId?: string | null;
  eventType: AutonomousSafetyEventType | string;
  severity: AutonomousSafetySeverity;
  description: string;
  blockedAction?: string;
  details?: Record<string, unknown>;
  resolved: 'YES' | 'NO';
  createdAt: Date;
}

export interface AutonomousOperationsStatus {
  workspaceId: string;
  mode: AutonomousOperatingMode;
  status: AutonomousPolicyStatus;
  policy: AutonomousPolicy;
  todayUsage: {
    date: string;
    dailySpend: number;
    dailySpendLimit: number;
    campaignsCreated: number;
    maxCampaignsPerDay: number;
    adsCreated: number;
    maxNewAdsPerDay: number;
    reelsCreated: number;
    reelsRendered: number;
    reelsPublished: number;
    optimizationsApplied: number;
    conversionsToday: number;
    roasToday: number;
  };
  lastRun?: AutonomousRun;
  activeRun?: AutonomousRun;
  recentSafetyEvents: AutonomousSafetyEvent[];
}

export interface AutonomousJobPayload {
  id: string;
  action: 'RUN_AUTONOMOUS_OPERATIONS';
  workspaceId: string;
  brandId: string;
  campaignId?: string | null;
  triggerType?: AutonomousTriggerType;
  options?: {
    forceAutonomousMode?: boolean;
    skipPublish?: boolean;
    daysToPlan?: number;
  };
  timestamp: number;
}

export interface AutonomousJobResult {
  jobId: string;
  workspaceId: string;
  brandId: string;
  runId: string;
  status: AutonomousRunStatus;
  processedAt: string;
  error?: string;
}

// ==========================================
// Phase 15: SaaS Commercialization & Billing Domain
// ==========================================

export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'INCOMPLETE';

export interface TierLimits {
  maxReelsPerMonth: number;
  maxBrands: number;
  maxTeamMembers: number;
  maxCampaignsPerMonth: number;
  maxDailyAdSpend: number;
  autonomousEngineEnabled: boolean;
  metaPublishingEnabled: boolean;
  exportResolution: '720p' | '1080p' | '4k';
  storageLimitGb: number;
  supportLevel: 'community' | 'standard' | 'priority' | 'dedicated';
}

export interface BillingPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  limits: TierLimits;
  features: string[];
  popular?: boolean;
}

export interface WorkspaceSubscription {
  id: string;
  workspaceId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceUsageRecord {
  id: string;
  workspaceId: string;
  periodMonth: string; // YYYY-MM
  reelsGenerated: number;
  reelsRendered: number;
  reelsPublished: number;
  campaignsCreated: number;
  storageUsedBytes: number;
  metaAdsSpend: number;
  aiTokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingInvoice {
  id: string;
  workspaceId: string;
  stripeInvoiceId: string;
  amountDueUsd: number;
  amountPaidUsd: number;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'UNCOLLECTIBLE' | 'VOID';
  invoiceUrl?: string | null;
  pdfUrl?: string | null;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date | null;
  createdAt: Date;
}

export interface TierLimitCheckResult {
  allowed: boolean;
  tier: SubscriptionTier;
  feature: string;
  currentUsage: number;
  limit: number;
  reason?: string;
  upgradeRequired?: boolean;
}

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
}

// ==========================================
// Google Veo 3.1 Types
// ==========================================

export type VeoModel = 'veo-3.1-generate-preview' | string;
export type VeoResolution = '720p' | '1080p';
export type VeoAspectRatio = '9:16' | '16:9' | '1:1';
export type VeoDuration = 4 | 6 | 8 | number;
export type VeoOperationStatus = 'SUBMITTED' | 'POLLING' | 'COMPLETED' | 'FAILED';

export interface VeoImageInput {
  imageBytes?: string; // base64 encoded string
  uri?: string; // Google Files API URI or accessible HTTP URL
  mimeType?: string; // e.g. 'image/png', 'image/jpeg'
}

export type VeoReferenceType = 'REFERENCE_TYPE_SUBJECT' | 'REFERENCE_TYPE_STYLE' | 'REFERENCE_TYPE_ASSET' | string;

export interface VeoReferenceImage {
  image: VeoImageInput;
  referenceType?: VeoReferenceType;
  referenceId?: number;
}

export interface VeoVideoGenerationInput {
  prompt: string;
  model?: VeoModel;
  aspectRatio?: VeoAspectRatio;
  durationSeconds?: VeoDuration;
  resolution?: VeoResolution;
  fps?: number;
  negativePrompt?: string;
  enhancePrompt?: boolean;
  generateAudio?: boolean; // Native generated audio
  seed?: number;
  personGeneration?: 'dont_allow' | 'allow_adult' | string;
  numberOfVideos?: number;
  workspaceId?: string;
  reelPlanId?: string;
  sceneNumber?: number;
}

export interface VeoImageToVideoInput extends Omit<VeoVideoGenerationInput, 'prompt'> {
  prompt?: string;
  image: VeoImageInput; // First-frame or source image
  lastFrame?: VeoImageInput; // Last-frame interpolation
}

export interface VeoReferenceVideoInput extends VeoVideoGenerationInput {
  referenceImages: VeoReferenceImage[];
}

export interface VeoOperationResult {
  operationId: string;
  status: VeoOperationStatus;
  done: boolean;
  provider: 'google-veo';
  model: string;
  videoUri?: string;
  videoBytes?: string;
  raiFilteredCount?: number;
  raiFilteredReasons?: string[];
  error?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface VeoProviderConfig {
  apiKey?: string;
  model?: string;
  enabled?: boolean;
  defaultResolution?: VeoResolution;
  defaultAspectRatio?: VeoAspectRatio;
  defaultDuration?: VeoDuration;
}

export interface AIVideoOperationRecord {
  id: string;
  workspaceId?: string | null;
  provider: string;
  model: string;
  operationId: string;
  reelPlanId?: string | null;
  sceneNumber?: number | null;
  status: VeoOperationStatus;
  prompt: string;
  referenceAssetIds?: string[];
  outputStorageKey?: string | null;
  outputUrl?: string | null;
  metadata?: Record<string, unknown>;
  error?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export type SceneVideoSource = 'VEO' | 'MEDIA_ASSET' | 'GENERATED';
export type SceneVideoArtifactStatus = 'READY' | 'GENERATING' | 'FAILED';

export interface SceneVideoArtifact {
  sceneNumber: number;
  duration: number;
  provider: string;
  source: SceneVideoSource;
  videoUrl: string;
  storageKey?: string;
  localPath?: string;
  width: number;
  height: number;
  fps: number;
  status: SceneVideoArtifactStatus;
  generationMetadata?: Record<string, unknown>;
}

export interface PlatformSafeAreaSpec {
  topMarginPercent: number;
  bottomMarginPercent: number;
  sideMarginPercent: number;
  safeBox: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ReelQAReport {
  valid: boolean;
  duration: { target: number; actual: number; passed: boolean };
  dimensions: { target: { width: number; height: number }; actual: { width: number; height: number }; passed: boolean };
  codecs: { video: string; audio: string; passed: boolean };
  audioCheck: { hasAudio: boolean; isNonSilent: boolean; passed: boolean };
  visualVariance: { averageStdDev: number; uniqueColors: number; passed: boolean };
  sceneCoverage: { totalScenes: number; renderedScenes: number; passed: boolean };
  productPresence: { detected: boolean; productId?: string | null; passed: boolean };
  brandPresence: { detected: boolean; logoPresent: boolean; passed: boolean };
  ctaPresence: { detected: boolean; passed: boolean };
  frameIntegrity: { noBlackFrames: boolean; noBlankFrames: boolean; noFrozenFrames: boolean; passed: boolean };
  failureReasons: string[];
  warnings?: string[];
  inspectedAt: string;
}

