import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  real,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const workspaceRoleEnum = pgEnum('workspace_role', ['OWNER', 'ADMIN', 'MEMBER']);

// Users Table
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email)
  ]
);

// Sessions Table
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('sessions_token_hash_idx').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt)
  ]
);

// Workspaces Table
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('workspaces_owner_id_idx').on(table.ownerId)
  ]
);

// Workspace Members Table
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull().default('MEMBER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('workspace_user_unique_idx').on(table.workspaceId, table.userId),
    index('workspace_members_workspace_id_idx').on(table.workspaceId),
    index('workspace_members_user_id_idx').on(table.userId)
  ]
);

// ====================================================
// Phase 2: Brand Brain Tables
// ====================================================

// Brands Table (Workspace-scoped)
export const brands = pgTable(
  'brands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description').notNull(),
    websiteUrl: varchar('website_url', { length: 500 }),
    story: text('story'),
    industry: varchar('industry', { length: 100 }).notNull(),
    targetAudience: text('target_audience'),
    brandVoice: varchar('brand_voice', { length: 255 }),
    brandPersonality: varchar('brand_personality', { length: 255 }),
    uniqueSellingPoints: jsonb('unique_selling_points').$type<string[]>().default([]),
    pricingInfo: jsonb('pricing_info').$type<Record<string, unknown>>(),
    offers: jsonb('offers').$type<string[]>().default([]),
    primaryCta: varchar('primary_cta', { length: 255 }),
    socialLinks: jsonb('social_links').$type<Record<string, string>>(),
    brandColors: jsonb('brand_colors').$type<Record<string, string>>(),
    typography: jsonb('typography').$type<Record<string, string>>(),
    contentPillars: jsonb('content_pillars').$type<string[]>().default([]),
    marketingRules: jsonb('marketing_rules').$type<{
      claimsToAvoid?: string[];
      brandRestrictions?: string[];
      complianceRules?: string[];
    }>(),
    competitorReferences: jsonb('competitor_references').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('brands_workspace_id_idx').on(table.workspaceId),
    uniqueIndex('brands_workspace_slug_unique_idx').on(table.workspaceId, table.slug)
  ]
);

// Brand Products / Services Table
export const brandProducts = pgTable(
  'brand_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 100 }),
    price: integer('price'),
    currency: varchar('currency', { length: 10 }).default('USD'),
    features: jsonb('features').$type<string[]>().default([]),
    benefits: jsonb('benefits').$type<string[]>().default([]),
    usps: jsonb('usps').$type<string[]>().default([]),
    targetAudience: text('target_audience'),
    offerInfo: jsonb('offer_info').$type<Record<string, unknown>>(),
    cta: varchar('cta', { length: 255 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('brand_products_brand_id_idx').on(table.brandId)
  ]
);

// Brand Assets Table
export const brandAssets = pgTable(
  'brand_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // 'logo', 'product_image', 'brand_image', 'document'
    name: varchar('name', { length: 255 }).notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('brand_assets_brand_id_idx').on(table.brandId)
  ]
);

// Brand DNA Table (Persistent Structured Intelligence with Versioning)
export const brandDna = pgTable(
  'brand_dna',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    identity: jsonb('identity').notNull(),
    audience: jsonb('audience').notNull(),
    messaging: jsonb('messaging').notNull(),
    products: jsonb('products').notNull(),
    visualIdentity: jsonb('visual_identity').notNull(),
    contentStrategy: jsonb('content_strategy').notNull(),
    promotionRules: jsonb('promotion_rules').notNull(),
    generatedBy: varchar('generated_by', { length: 100 }).notNull().default('ai-gemini'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('brand_dna_brand_id_idx').on(table.brandId),
    uniqueIndex('brand_dna_brand_version_unique_idx').on(table.brandId, table.version)
  ]
);

// ====================================================
// Phase 3: Marketing Brain & Campaign Tables
// ====================================================

// Marketing Strategies Table (Persistent Versioned Strategy)
export const marketingStrategies = pgTable(
  'marketing_strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    objective: varchar('objective', { length: 100 }).notNull(),
    businessGoal: text('business_goal').notNull(),
    marketingGoal: text('marketing_goal').notNull(),
    targetAudience: jsonb('target_audience').notNull().default({}),
    positioning: jsonb('positioning').notNull().default({}),
    messagingStrategy: jsonb('messaging_strategy').notNull().default({}),
    contentStrategy: jsonb('content_strategy').notNull().default({}),
    funnelStrategy: jsonb('funnel_strategy').notNull().default({}),
    channelStrategy: jsonb('channel_strategy').notNull().default({}),
    offerStrategy: jsonb('offer_strategy').notNull().default({}),
    kpiStrategy: jsonb('kpi_strategy').notNull().default({}),
    risksAndGuardrails: jsonb('risks_and_guardrails').notNull().default({}),
    aiMetadata: jsonb('ai_metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('marketing_strategies_brand_id_idx').on(table.brandId),
    uniqueIndex('marketing_strategies_brand_version_unique_idx').on(table.brandId, table.version)
  ]
);

// Campaigns Table (Persistent Campaign Entity)
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    objective: varchar('objective', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, READY, ACTIVE, PAUSED, COMPLETED, ARCHIVED
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    targetAudience: jsonb('target_audience').default({}),
    coreMessage: text('core_message'),
    offer: text('offer'),
    primaryCta: varchar('primary_cta', { length: 255 }),
    contentPillars: jsonb('content_pillars').$type<string[]>().default([]),
    channels: jsonb('channels').$type<string[]>().default([]),
    campaignStrategy: jsonb('campaign_strategy'),
    strategyVersion: integer('strategy_version').notNull().default(0),
    kpis: jsonb('kpis').default({}),
    guardrails: jsonb('guardrails').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('campaigns_brand_id_idx').on(table.brandId),
    index('campaigns_status_idx').on(table.status)
  ]
);

// ====================================================
// Phase 4: 30-Day Content Planner Tables
// ====================================================

// Content Plans Table (Persistent 30-Day Strategy Container)
export const contentPlans = pgTable(
  'content_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .references(() => campaigns.id, { onDelete: 'set null' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    objective: varchar('objective', { length: 255 }).notNull(),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    durationDays: integer('duration_days').notNull().default(30),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, GENERATING, READY, ACTIVE, PAUSED, COMPLETED, ARCHIVED
    version: integer('version').notNull().default(1),
    planGroupId: uuid('plan_group_id').notNull().defaultRandom(),
    strategySnapshot: jsonb('strategy_snapshot').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('content_plans_brand_id_idx').on(table.brandId),
    index('content_plans_campaign_id_idx').on(table.campaignId),
    index('content_plans_workspace_id_idx').on(table.workspaceId),
    index('content_plans_status_idx').on(table.status),
    uniqueIndex('content_plans_group_version_idx').on(table.planGroupId, table.version)
  ]
);

// Content Jobs Table (Individual Planned Content Days)
export const contentJobs = pgTable(
  'content_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentPlanId: uuid('content_plan_id')
      .notNull()
      .references(() => contentPlans.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .references(() => campaigns.id, { onDelete: 'set null' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    dayNumber: integer('day_number').notNull(),
    scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 50 }).notNull(),
    funnelStage: varchar('funnel_stage', { length: 50 }).notNull(),
    contentPillar: varchar('content_pillar', { length: 255 }).notNull(),
    objective: varchar('objective', { length: 500 }).notNull(),
    audience: varchar('audience', { length: 500 }).notNull(),
    topic: varchar('topic', { length: 500 }).notNull(),
    hook: text('hook').notNull(),
    keyMessage: text('key_message').notNull(),
    messagingAngle: varchar('messaging_angle', { length: 500 }).notNull(),
    offer: varchar('offer', { length: 500 }),
    cta: varchar('cta', { length: 500 }).notNull(),
    platform: varchar('platform', { length: 50 }).notNull(),
    format: varchar('format', { length: 50 }).notNull(),
    priority: varchar('priority', { length: 20 }).notNull().default('MEDIUM'), // HIGH, MEDIUM, LOW
    status: varchar('status', { length: 50 }).notNull().default('PLANNED'), // PLANNED, READY, IN_PROGRESS, COMPLETED, SKIPPED, CANCELLED
    strategy: jsonb('strategy').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('content_jobs_plan_id_idx').on(table.contentPlanId),
    index('content_jobs_brand_id_idx').on(table.brandId),
    index('content_jobs_campaign_id_idx').on(table.campaignId),
    index('content_jobs_day_number_idx').on(table.dayNumber),
    index('content_jobs_scheduled_date_idx').on(table.scheduledDate),
    index('content_jobs_status_idx').on(table.status)
  ]
);

// Drizzle Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id]
  }),
  members: many(workspaceMembers),
  brands: many(brands),
  contentPlans: many(contentPlans),
  contentJobs: many(contentJobs)
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id]
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id]
  })
}));

export const brandsRelations = relations(brands, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [brands.workspaceId],
    references: [workspaces.id]
  }),
  products: many(brandProducts),
  assets: many(brandAssets),
  dnaHistory: many(brandDna),
  marketingStrategies: many(marketingStrategies),
  campaigns: many(campaigns),
  contentPlans: many(contentPlans),
  contentJobs: many(contentJobs)
}));

export const brandProductsRelations = relations(brandProducts, ({ one }) => ({
  brand: one(brands, {
    fields: [brandProducts.brandId],
    references: [brands.id]
  })
}));

export const brandAssetsRelations = relations(brandAssets, ({ one }) => ({
  brand: one(brands, {
    fields: [brandAssets.brandId],
    references: [brands.id]
  })
}));

export const brandDnaRelations = relations(brandDna, ({ one }) => ({
  brand: one(brands, {
    fields: [brandDna.brandId],
    references: [brands.id]
  })
}));

export const marketingStrategiesRelations = relations(marketingStrategies, ({ one }) => ({
  brand: one(brands, {
    fields: [marketingStrategies.brandId],
    references: [brands.id]
  })
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  brand: one(brands, {
    fields: [campaigns.brandId],
    references: [brands.id]
  }),
  contentPlans: many(contentPlans),
  contentJobs: many(contentJobs)
}));

export const contentPlansRelations = relations(contentPlans, ({ one, many }) => ({
  brand: one(brands, {
    fields: [contentPlans.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [contentPlans.campaignId],
    references: [campaigns.id]
  }),
  workspace: one(workspaces, {
    fields: [contentPlans.workspaceId],
    references: [workspaces.id]
  }),
  jobs: many(contentJobs)
}));

export const contentJobsRelations = relations(contentJobs, ({ one, many }) => ({
  contentPlan: one(contentPlans, {
    fields: [contentJobs.contentPlanId],
    references: [contentPlans.id]
  }),
  brand: one(brands, {
    fields: [contentJobs.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [contentJobs.campaignId],
    references: [campaigns.id]
  }),
  workspace: one(workspaces, {
    fields: [contentJobs.workspaceId],
    references: [workspaces.id]
  }),
  reelPlans: many(reelProductionPlans)
}));

// ====================================================
// Phase 5: Reel Production Plans Table
// ====================================================
export const reelProductionPlans = pgTable(
  'reel_production_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentJobId: uuid('content_job_id')
      .notNull()
      .references(() => contentJobs.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .references(() => campaigns.id, { onDelete: 'set null' }),
    contentPlanId: uuid('content_plan_id')
      .notNull()
      .references(() => contentPlans.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    title: varchar('title', { length: 255 }).notNull(),
    concept: jsonb('concept').notNull().default({}),
    objective: varchar('objective', { length: 500 }).notNull(),
    audience: varchar('audience', { length: 500 }).notNull(),
    funnelStage: varchar('funnel_stage', { length: 50 }).notNull(),
    contentPillar: varchar('content_pillar', { length: 255 }).notNull(),
    durationSeconds: integer('duration_seconds').notNull().default(30),
    aspectRatio: varchar('aspect_ratio', { length: 20 }).notNull().default('9:16'),
    platform: varchar('platform', { length: 50 }).notNull().default('INSTAGRAM'),
    format: varchar('format', { length: 50 }).notNull().default('REEL'),
    hook: jsonb('hook').notNull().default({}),
    narrative: text('narrative').notNull(),
    script: jsonb('script').notNull().default([]),
    scenes: jsonb('scenes').notNull().default([]),
    visualDirection: jsonb('visual_direction').notNull().default({}),
    voiceDirection: jsonb('voice_direction').notNull().default({}),
    captionDirection: jsonb('caption_direction').notNull().default({}),
    animationDirection: jsonb('animation_direction').notNull().default({}),
    audioDirection: jsonb('audio_direction').notNull().default({}),
    cta: jsonb('cta').notNull().default({}),
    productionMetadata: jsonb('production_metadata').notNull().default({}),
    status: varchar('status', { length: 50 }).notNull().default('READY'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('reel_production_plans_job_id_idx').on(table.contentJobId),
    index('reel_production_plans_brand_id_idx').on(table.brandId),
    index('reel_production_plans_campaign_id_idx').on(table.campaignId),
    index('reel_production_plans_plan_id_idx').on(table.contentPlanId),
    index('reel_production_plans_workspace_id_idx').on(table.workspaceId),
    index('reel_production_plans_status_idx').on(table.status),
    uniqueIndex('reel_production_plans_job_version_idx').on(table.contentJobId, table.version)
  ]
);

export const reelProductionPlansRelations = relations(reelProductionPlans, ({ one, many }) => ({
  contentJob: one(contentJobs, {
    fields: [reelProductionPlans.contentJobId],
    references: [contentJobs.id]
  }),
  brand: one(brands, {
    fields: [reelProductionPlans.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [reelProductionPlans.campaignId],
    references: [campaigns.id]
  }),
  contentPlan: one(contentPlans, {
    fields: [reelProductionPlans.contentPlanId],
    references: [contentPlans.id]
  }),
  workspace: one(workspaces, {
    fields: [reelProductionPlans.workspaceId],
    references: [workspaces.id]
  }),
  assets: many(reelAssets),
  captionTracks: many(captionTracks),
  audioMixPlans: many(audioMixPlans),
  productionPackages: many(reelProductionPackages)
}));

// ====================================================
// Phase 6: Media + Voice + Captions + Audio Tables
// ====================================================

// 1. Reel Assets Table
export const reelAssets = pgTable(
  'reel_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    sceneNumber: integer('scene_number'),
    assetType: varchar('asset_type', { length: 50 }).notNull(), // VIDEO, IMAGE, LOGO, PRODUCT_IMAGE, PRODUCT_VIDEO, MUSIC, SFX, VOICE, CAPTION
    sourceType: varchar('source_type', { length: 50 }).notNull(), // BRAND_LIBRARY, PEXELS, LOCAL_GALLERY, GENERATED, EXTERNAL
    provider: varchar('provider', { length: 100 }).notNull(), // pexels, brand_library, local_gallery, ai_gemini, elevenlabs, mock_voice
    providerAssetId: varchar('provider_asset_id', { length: 255 }),
    sourceUrl: varchar('source_url', { length: 2000 }),
    previewUrl: varchar('preview_url', { length: 2000 }),
    storageKey: varchar('storage_key', { length: 500 }),
    filename: varchar('filename', { length: 255 }),
    mimeType: varchar('mime_type', { length: 100 }),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: real('duration_seconds'),
    metadata: jsonb('metadata').notNull().default({}),
    licenseMetadata: jsonb('license_metadata').notNull().default({}),
    status: varchar('status', { length: 50 }).notNull().default('READY'), // DISCOVERED, SELECTED, DOWNLOADING, READY, FAILED, REJECTED
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('reel_assets_reel_plan_id_idx').on(table.reelPlanId),
    index('reel_assets_workspace_id_idx').on(table.workspaceId),
    index('reel_assets_brand_id_idx').on(table.brandId),
    index('reel_assets_asset_type_idx').on(table.assetType),
    index('reel_assets_status_idx').on(table.status),
    index('reel_assets_scene_number_idx').on(table.sceneNumber)
  ]
);

export const reelAssetsRelations = relations(reelAssets, ({ one }) => ({
  reelPlan: one(reelProductionPlans, {
    fields: [reelAssets.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  workspace: one(workspaces, {
    fields: [reelAssets.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [reelAssets.brandId],
    references: [brands.id]
  })
}));

// 2. Caption Tracks Table
export const captionTracks = pgTable(
  'caption_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    cues: jsonb('cues').notNull().default([]),
    style: jsonb('style').notNull().default({}),
    status: varchar('status', { length: 50 }).notNull().default('READY'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('caption_tracks_reel_plan_id_idx').on(table.reelPlanId),
    index('caption_tracks_workspace_id_idx').on(table.workspaceId),
    index('caption_tracks_brand_id_idx').on(table.brandId),
    uniqueIndex('caption_tracks_reel_version_idx').on(table.reelPlanId, table.version)
  ]
);

export const captionTracksRelations = relations(captionTracks, ({ one }) => ({
  reelPlan: one(reelProductionPlans, {
    fields: [captionTracks.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  workspace: one(workspaces, {
    fields: [captionTracks.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [captionTracks.brandId],
    references: [brands.id]
  })
}));

// 3. Audio Mix Plans Table
export const audioMixPlans = pgTable(
  'audio_mix_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    voiceConfig: jsonb('voice_config').notNull().default({}),
    musicConfig: jsonb('music_config').notNull().default({}),
    sfxConfigs: jsonb('sfx_configs').notNull().default([]),
    mixSettings: jsonb('mix_settings').notNull().default({}),
    status: varchar('status', { length: 50 }).notNull().default('READY'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('audio_mix_plans_reel_plan_id_idx').on(table.reelPlanId),
    index('audio_mix_plans_workspace_id_idx').on(table.workspaceId),
    index('audio_mix_plans_brand_id_idx').on(table.brandId)
  ]
);

export const audioMixPlansRelations = relations(audioMixPlans, ({ one }) => ({
  reelPlan: one(reelProductionPlans, {
    fields: [audioMixPlans.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  workspace: one(workspaces, {
    fields: [audioMixPlans.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [audioMixPlans.brandId],
    references: [brands.id]
  })
}));

// 4. Reel Production Packages Table
export const reelProductionPackages = pgTable(
  'reel_production_packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    readiness: jsonb('readiness').notNull().default({}),
    packagePayload: jsonb('package_payload').notNull().default({}),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('reel_production_packages_reel_plan_id_idx').on(table.reelPlanId),
    index('reel_production_packages_workspace_id_idx').on(table.workspaceId),
    index('reel_production_packages_brand_id_idx').on(table.brandId),
    index('reel_production_packages_status_idx').on(table.status)
  ]
);

export const reelProductionPackagesRelations = relations(reelProductionPackages, ({ one }) => ({
  reelPlan: one(reelProductionPlans, {
    fields: [reelProductionPackages.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  workspace: one(workspaces, {
    fields: [reelProductionPackages.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [reelProductionPackages.brandId],
    references: [brands.id]
  })
}));

// ====================================================
// Phase 7: Animation Intelligence Tables
// ====================================================

// Animation Plans Table
export const animationPlans = pgTable(
  'animation_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    productionPackageId: uuid('production_package_id')
      .notNull()
      .references(() => reelProductionPackages.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    status: varchar('status', { length: 50 }).notNull().default('READY'),
    animationLanguage: varchar('animation_language', { length: 50 }).notNull(),
    globalSettings: jsonb('global_settings').notNull().default({}),
    sceneAnimations: jsonb('scene_animations').notNull().default([]),
    transitionPlan: jsonb('transition_plan').notNull().default([]),
    textAnimationPlan: jsonb('text_animation_plan').notNull().default([]),
    cameraPlan: jsonb('camera_plan').notNull().default([]),
    productAnimationPlan: jsonb('product_animation_plan').notNull().default([]),
    logoAnimationPlan: jsonb('logo_animation_plan').notNull().default([]),
    syncPlan: jsonb('sync_plan').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('animation_plans_workspace_id_idx').on(table.workspaceId),
    index('animation_plans_brand_id_idx').on(table.brandId),
    index('animation_plans_reel_plan_id_idx').on(table.reelPlanId),
    index('animation_plans_package_id_idx').on(table.productionPackageId),
    index('animation_plans_status_idx').on(table.status),
    uniqueIndex('animation_plans_reel_version_idx').on(table.reelPlanId, table.version)
  ]
);

export const animationPlansRelations = relations(animationPlans, ({ one }) => ({
  reelPlan: one(reelProductionPlans, {
    fields: [animationPlans.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  productionPackage: one(reelProductionPackages, {
    fields: [animationPlans.productionPackageId],
    references: [reelProductionPackages.id]
  }),
  workspace: one(workspaces, {
    fields: [animationPlans.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [animationPlans.brandId],
    references: [brands.id]
  })
}));

export const socialPublications = pgTable(
  'social_publications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 50 }).notNull().default('INSTAGRAM'),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    externalPostId: varchar('external_post_id', { length: 255 }),
    externalUrl: text('external_url'),
    payload: jsonb('payload').notNull().default({}),
    attemptCount: integer('attempt_count').notNull().default(0),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('social_publications_workspace_id_idx').on(table.workspaceId),
    index('social_publications_brand_id_idx').on(table.brandId),
    index('social_publications_reel_plan_id_idx').on(table.reelPlanId),
    index('social_publications_status_idx').on(table.status),
    index('social_publications_platform_idx').on(table.platform)
  ]
);

export const socialPublicationsRelations = relations(socialPublications, ({ one }) => ({
  reelPlan: one(reelProductionPlans, {
    fields: [socialPublications.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  workspace: one(workspaces, {
    fields: [socialPublications.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [socialPublications.brandId],
    references: [brands.id]
  })
}));

// ====================================================
// Phase 10: Meta Ads Integration Tables
// ====================================================

// 1. Meta Connections Table (Workspace-scoped)
export const metaConnections = pgTable(
  'meta_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metaUserId: varchar('meta_user_id', { length: 255 }).notNull(),
    metaUserName: varchar('meta_user_name', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    adAccounts: jsonb('ad_accounts').notNull().default([]),
    pages: jsonb('pages').notNull().default([]),
    selectedAdAccountId: varchar('selected_ad_account_id', { length: 255 }),
    selectedPageId: varchar('selected_page_id', { length: 255 }),
    selectedInstagramActorId: varchar('selected_instagram_actor_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('CONNECTED'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('meta_connections_workspace_unique_idx').on(table.workspaceId),
    index('meta_connections_workspace_id_idx').on(table.workspaceId),
    index('meta_connections_status_idx').on(table.status)
  ]
);

export const metaConnectionsRelations = relations(metaConnections, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [metaConnections.workspaceId],
    references: [workspaces.id]
  })
}));

// 2. Meta Ad Campaigns Table
export const metaAdCampaigns = pgTable(
  'meta_ad_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .references(() => campaigns.id, { onDelete: 'set null' }),
    metaAdAccountId: varchar('meta_ad_account_id', { length: 255 }).notNull(),
    externalCampaignId: varchar('external_campaign_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    objective: varchar('objective', { length: 100 }).notNull(),
    buyingType: varchar('buying_type', { length: 50 }).notNull().default('AUCTION'),
    status: varchar('status', { length: 50 }).notNull().default('PAUSED'),
    dailyBudget: integer('daily_budget'),
    lifetimeBudget: integer('lifetime_budget'),
    specialAdCategories: jsonb('special_ad_categories').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('meta_ad_campaigns_workspace_id_idx').on(table.workspaceId),
    index('meta_ad_campaigns_brand_id_idx').on(table.brandId),
    index('meta_ad_campaigns_campaign_id_idx').on(table.campaignId),
    index('meta_ad_campaigns_external_id_idx').on(table.externalCampaignId)
  ]
);

export const metaAdCampaignsRelations = relations(metaAdCampaigns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [metaAdCampaigns.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [metaAdCampaigns.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [metaAdCampaigns.campaignId],
    references: [campaigns.id]
  }),
  adSets: many(metaAdSets)
}));

// 3. Meta Ad Sets Table
export const metaAdSets = pgTable(
  'meta_ad_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metaAdCampaignId: uuid('meta_ad_campaign_id')
      .notNull()
      .references(() => metaAdCampaigns.id, { onDelete: 'cascade' }),
    externalAdSetId: varchar('external_ad_set_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PAUSED'),
    billingEvent: varchar('billing_event', { length: 50 }).notNull().default('IMPRESSIONS'),
    optimizationGoal: varchar('optimization_goal', { length: 50 }).notNull().default('LINK_CLICKS'),
    dailyBudget: integer('daily_budget'),
    lifetimeBudget: integer('lifetime_budget'),
    targeting: jsonb('targeting').notNull().default({}),
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    promotedObject: jsonb('promoted_object').notNull().default({}),
    bidAmount: integer('bid_amount'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('meta_ad_sets_workspace_id_idx').on(table.workspaceId),
    index('meta_ad_sets_campaign_id_idx').on(table.metaAdCampaignId),
    index('meta_ad_sets_external_id_idx').on(table.externalAdSetId)
  ]
);

export const metaAdSetsRelations = relations(metaAdSets, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [metaAdSets.workspaceId],
    references: [workspaces.id]
  }),
  metaCampaign: one(metaAdCampaigns, {
    fields: [metaAdSets.metaAdCampaignId],
    references: [metaAdCampaigns.id]
  }),
  ads: many(metaAds)
}));

// 4. Meta Ad Creatives Table
export const metaAdCreatives = pgTable(
  'meta_ad_creatives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    externalCreativeId: varchar('external_creative_id', { length: 255 }).notNull(),
    externalVideoId: varchar('external_video_id', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    callToActionType: varchar('call_to_action_type', { length: 50 }).notNull().default('LEARN_MORE'),
    destinationUrl: text('destination_url').notNull(),
    linkCaption: varchar('link_caption', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('meta_ad_creatives_workspace_id_idx').on(table.workspaceId),
    index('meta_ad_creatives_brand_id_idx').on(table.brandId),
    index('meta_ad_creatives_reel_plan_id_idx').on(table.reelPlanId),
    index('meta_ad_creatives_external_id_idx').on(table.externalCreativeId)
  ]
);

export const metaAdCreativesRelations = relations(metaAdCreatives, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [metaAdCreatives.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [metaAdCreatives.brandId],
    references: [brands.id]
  }),
  reelPlan: one(reelProductionPlans, {
    fields: [metaAdCreatives.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  ads: many(metaAds)
}));

// 5. Meta Ads Table
export const metaAds = pgTable(
  'meta_ads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metaAdSetId: uuid('meta_ad_set_id')
      .notNull()
      .references(() => metaAdSets.id, { onDelete: 'cascade' }),
    metaAdCreativeId: uuid('meta_ad_creative_id')
      .notNull()
      .references(() => metaAdCreatives.id, { onDelete: 'cascade' }),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    externalAdId: varchar('external_ad_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PAUSED'),
    trackingSpecs: jsonb('tracking_specs').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('meta_ads_workspace_id_idx').on(table.workspaceId),
    index('meta_ads_ad_set_id_idx').on(table.metaAdSetId),
    index('meta_ads_creative_id_idx').on(table.metaAdCreativeId),
    index('meta_ads_reel_plan_id_idx').on(table.reelPlanId),
    index('meta_ads_external_id_idx').on(table.externalAdId)
  ]
);

export const metaAdsRelations = relations(metaAds, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [metaAds.workspaceId],
    references: [workspaces.id]
  }),
  adSet: one(metaAdSets, {
    fields: [metaAds.metaAdSetId],
    references: [metaAdSets.id]
  }),
  creative: one(metaAdCreatives, {
    fields: [metaAds.metaAdCreativeId],
    references: [metaAdCreatives.id]
  }),
  reelPlan: one(reelProductionPlans, {
    fields: [metaAds.reelPlanId],
    references: [reelProductionPlans.id]
  })
}));

// 6. Meta Ad Publications Table
export const metaAdPublications = pgTable(
  'meta_ad_publications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    reelPlanId: uuid('reel_plan_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    metaCampaignId: uuid('meta_campaign_id')
      .references(() => metaAdCampaigns.id, { onDelete: 'set null' }),
    metaAdSetId: uuid('meta_ad_set_id')
      .references(() => metaAdSets.id, { onDelete: 'set null' }),
    metaCreativeId: uuid('meta_creative_id')
      .references(() => metaAdCreatives.id, { onDelete: 'set null' }),
    metaAdId: uuid('meta_ad_id')
      .references(() => metaAds.id, { onDelete: 'set null' }),
    externalCampaignId: varchar('external_campaign_id', { length: 255 }),
    externalAdSetId: varchar('external_ad_set_id', { length: 255 }),
    externalCreativeId: varchar('external_creative_id', { length: 255 }),
    externalAdId: varchar('external_ad_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('meta_ad_pub_idempotency_idx').on(table.idempotencyKey),
    index('meta_ad_publications_workspace_id_idx').on(table.workspaceId),
    index('meta_ad_publications_brand_id_idx').on(table.brandId),
    index('meta_ad_publications_reel_plan_id_idx').on(table.reelPlanId),
    index('meta_ad_publications_status_idx').on(table.status)
  ]
);

export const metaAdPublicationsRelations = relations(metaAdPublications, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [metaAdPublications.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [metaAdPublications.brandId],
    references: [brands.id]
  }),
  reelPlan: one(reelProductionPlans, {
    fields: [metaAdPublications.reelPlanId],
    references: [reelProductionPlans.id]
  }),
  campaign: one(metaAdCampaigns, {
    fields: [metaAdPublications.metaCampaignId],
    references: [metaAdCampaigns.id]
  }),
  adSet: one(metaAdSets, {
    fields: [metaAdPublications.metaAdSetId],
    references: [metaAdSets.id]
  }),
  creative: one(metaAdCreatives, {
    fields: [metaAdPublications.metaCreativeId],
    references: [metaAdCreatives.id]
  }),
  ad: one(metaAds, {
    fields: [metaAdPublications.metaAdId],
    references: [metaAds.id]
  })
}));

// Inferred Types
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;

export type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMemberRow = typeof workspaceMembers.$inferInsert;

export type BrandRow = typeof brands.$inferSelect;
export type NewBrandRow = typeof brands.$inferInsert;

export type BrandProductRow = typeof brandProducts.$inferSelect;
export type NewBrandProductRow = typeof brandProducts.$inferInsert;

export type BrandAssetRow = typeof brandAssets.$inferSelect;
export type NewBrandAssetRow = typeof brandAssets.$inferInsert;

export type BrandDnaRow = typeof brandDna.$inferSelect;
export type NewBrandDnaRow = typeof brandDna.$inferInsert;

export type MarketingStrategyRow = typeof marketingStrategies.$inferSelect;
export type NewMarketingStrategyRow = typeof marketingStrategies.$inferInsert;

export type CampaignRow = typeof campaigns.$inferSelect;
export type NewCampaignRow = typeof campaigns.$inferInsert;

export type ContentPlanRow = typeof contentPlans.$inferSelect;
export type NewContentPlanRow = typeof contentPlans.$inferInsert;

export type ContentJobRow = typeof contentJobs.$inferSelect;
export type NewContentJobRow = typeof contentJobs.$inferInsert;

export type ReelProductionPlanRow = typeof reelProductionPlans.$inferSelect;
export type NewReelProductionPlanRow = typeof reelProductionPlans.$inferInsert;

export type ReelAssetRow = typeof reelAssets.$inferSelect;
export type NewReelAssetRow = typeof reelAssets.$inferInsert;

export type CaptionTrackRow = typeof captionTracks.$inferSelect;
export type NewCaptionTrackRow = typeof captionTracks.$inferInsert;

export type AudioMixPlanRow = typeof audioMixPlans.$inferSelect;
export type NewAudioMixPlanRow = typeof audioMixPlans.$inferInsert;

export type ReelProductionPackageRow = typeof reelProductionPackages.$inferSelect;
export type NewReelProductionPackageRow = typeof reelProductionPackages.$inferInsert;

export type AnimationPlanRow = typeof animationPlans.$inferSelect;
export type NewAnimationPlanRow = typeof animationPlans.$inferInsert;

export type SocialPublicationRow = typeof socialPublications.$inferSelect;
export type NewSocialPublicationRow = typeof socialPublications.$inferInsert;

export type MetaConnectionRow = typeof metaConnections.$inferSelect;
export type NewMetaConnectionRow = typeof metaConnections.$inferInsert;

export type MetaAdCampaignRow = typeof metaAdCampaigns.$inferSelect;
export type NewMetaAdCampaignRow = typeof metaAdCampaigns.$inferInsert;

export type MetaAdSetRow = typeof metaAdSets.$inferSelect;
export type NewMetaAdSetRow = typeof metaAdSets.$inferInsert;

export type MetaAdCreativeRow = typeof metaAdCreatives.$inferSelect;
export type NewMetaAdCreativeRow = typeof metaAdCreatives.$inferInsert;

export type MetaAdRow = typeof metaAds.$inferSelect;
export type NewMetaAdRow = typeof metaAds.$inferInsert;

export type MetaAdPublicationRow = typeof metaAdPublications.$inferSelect;
export type NewMetaAdPublicationRow = typeof metaAdPublications.$inferInsert;

// ====================================================
// Phase 11: Analytics & AI Optimization Engine Tables
// ====================================================

export const performanceSnapshots = pgTable(
  'performance_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    marketingCampaignId: uuid('marketing_campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    reelId: uuid('reel_id').references(() => reelProductionPlans.id, {
      onDelete: 'set null'
    }),
    publicationId: uuid('publication_id'),
    platform: varchar('platform', { length: 50 }).notNull().default('META'),
    externalCampaignId: varchar('external_campaign_id', { length: 255 }),
    externalAdSetId: varchar('external_ad_set_id', { length: 255 }),
    externalAdId: varchar('external_ad_id', { length: 255 }),
    externalPostId: varchar('external_post_id', { length: 255 }),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
    reportingWindowStart: timestamp('reporting_window_start', { withTimezone: true }),
    reportingWindowEnd: timestamp('reporting_window_end', { withTimezone: true }),
    impressions: integer('impressions'),
    reach: integer('reach'),
    videoViews: integer('video_views'),
    videoViews3s: integer('video_views_3s'),
    videoViewsThruplay: integer('video_views_thruplay'),
    watchTimeSeconds: real('watch_time_seconds'),
    averageWatchTimeSeconds: real('average_watch_time_seconds'),
    completionRate: real('completion_rate'),
    likes: integer('likes'),
    comments: integer('comments'),
    shares: integer('shares'),
    saves: integer('saves'),
    clicks: integer('clicks'),
    linkClicks: integer('link_clicks'),
    ctr: real('ctr'),
    cpc: real('cpc'),
    cpm: real('cpm'),
    spend: real('spend'),
    conversions: integer('conversions'),
    conversionValue: real('conversion_value'),
    purchases: integer('purchases'),
    revenue: real('revenue'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('perf_snapshots_workspace_id_idx').on(table.workspaceId),
    index('perf_snapshots_brand_id_idx').on(table.brandId),
    index('perf_snapshots_reel_id_idx').on(table.reelId),
    index('perf_snapshots_campaign_id_idx').on(table.marketingCampaignId),
    index('perf_snapshots_platform_idx').on(table.platform),
    index('perf_snapshots_collected_at_idx').on(table.collectedAt),
    index('perf_snapshots_ext_ad_idx').on(table.externalAdId)
  ]
);

export const performanceSnapshotsRelations = relations(performanceSnapshots, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [performanceSnapshots.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [performanceSnapshots.brandId],
    references: [brands.id]
  }),
  reelPlan: one(reelProductionPlans, {
    fields: [performanceSnapshots.reelId],
    references: [reelProductionPlans.id]
  }),
  campaign: one(campaigns, {
    fields: [performanceSnapshots.marketingCampaignId],
    references: [campaigns.id]
  })
}));

export const performanceMetricHistory = pgTable(
  'performance_metric_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    reelId: uuid('reel_id').references(() => reelProductionPlans.id, {
      onDelete: 'set null'
    }),
    externalCampaignId: varchar('external_campaign_id', { length: 255 }),
    externalAdSetId: varchar('external_ad_set_id', { length: 255 }),
    externalAdId: varchar('external_ad_id', { length: 255 }),
    platform: varchar('platform', { length: 50 }).notNull().default('META'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    metricPayload: jsonb('metric_payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('perf_history_workspace_id_idx').on(table.workspaceId),
    index('perf_history_brand_id_idx').on(table.brandId),
    index('perf_history_reel_id_idx').on(table.reelId),
    index('perf_history_timestamp_idx').on(table.timestamp)
  ]
);

export const contentPerformanceAnalysis = pgTable(
  'content_performance_analysis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    reelId: uuid('reel_id')
      .notNull()
      .references(() => reelProductionPlans.id, { onDelete: 'cascade' }),
    analyzedAt: timestamp('analyzed_at', { withTimezone: true }).notNull().defaultNow(),
    performanceTier: varchar('performance_tier', { length: 50 }).notNull(),
    hookScore: real('hook_score').notNull(),
    retentionScore: real('retention_score').notNull(),
    engagementScore: real('engagement_score').notNull(),
    conversionScore: real('conversion_score').notNull(),
    overallScore: real('overall_score').notNull(),
    strengths: jsonb('strengths').$type<string[]>().default([]),
    weaknesses: jsonb('weaknesses').$type<string[]>().default([]),
    detectedPatterns: jsonb('detected_patterns').$type<Record<string, unknown>>().default({}),
    metricSummary: jsonb('metric_summary').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('content_perf_analysis_workspace_id_idx').on(table.workspaceId),
    index('content_perf_analysis_brand_id_idx').on(table.brandId),
    index('content_perf_analysis_reel_id_idx').on(table.reelId),
    index('content_perf_analysis_tier_idx').on(table.performanceTier)
  ]
);

export const optimizationInsights = pgTable(
  'optimization_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    sourceReelId: uuid('source_reel_id').references(() => reelProductionPlans.id, {
      onDelete: 'set null'
    }),
    sourceCampaignId: uuid('source_campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    type: varchar('type', { length: 50 }).notNull(),
    priority: varchar('priority', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    recommendation: text('recommendation').notNull(),
    reasoning: text('reasoning').notNull(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().default({}),
    expectedImpact: varchar('expected_impact', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
  },
  (table) => [
    index('opt_insights_workspace_id_idx').on(table.workspaceId),
    index('opt_insights_brand_id_idx').on(table.brandId),
    index('opt_insights_type_idx').on(table.type),
    index('opt_insights_status_idx').on(table.status),
    index('opt_insights_priority_idx').on(table.priority)
  ]
);

export const optimizationLearning = pgTable(
  'optimization_learning',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    patternType: varchar('pattern_type', { length: 50 }).notNull(),
    patternKey: varchar('pattern_key', { length: 255 }).notNull(),
    sampleSize: integer('sample_size').notNull().default(1),
    confidenceScore: real('confidence_score').notNull().default(0.8),
    summary: text('summary').notNull(),
    evidenceReferences: jsonb('evidence_references').$type<Array<Record<string, unknown>>>().default([]),
    recommendations: jsonb('recommendations').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('opt_learning_workspace_id_idx').on(table.workspaceId),
    index('opt_learning_brand_id_idx').on(table.brandId),
    index('opt_learning_pattern_type_idx').on(table.patternType)
  ]
);

export const experiments = pgTable(
  'experiments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    experimentType: varchar('experiment_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('DRAFT'),
    variantA: jsonb('variant_a').$type<Record<string, unknown>>().notNull(),
    variantB: jsonb('variant_b').$type<Record<string, unknown>>().notNull(),
    targetMetric: varchar('target_metric', { length: 100 }).notNull().default('conversionRate'),
    sampleSizeA: integer('sample_size_a').notNull().default(0),
    sampleSizeB: integer('sample_size_b').notNull().default(0),
    confidenceScore: real('confidence_score'),
    winningVariant: varchar('winning_variant', { length: 20 }),
    resultSummary: text('result_summary'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('experiments_workspace_id_idx').on(table.workspaceId),
    index('experiments_brand_id_idx').on(table.brandId),
    index('experiments_status_idx').on(table.status)
  ]
);

// Inferred Types (Phase 11)
export type PerformanceSnapshotRow = typeof performanceSnapshots.$inferSelect;
export type NewPerformanceSnapshotRow = typeof performanceSnapshots.$inferInsert;

export type PerformanceMetricHistoryRow = typeof performanceMetricHistory.$inferSelect;
export type NewPerformanceMetricHistoryRow = typeof performanceMetricHistory.$inferInsert;

export type ContentPerformanceAnalysisRow = typeof contentPerformanceAnalysis.$inferSelect;
export type NewContentPerformanceAnalysisRow = typeof contentPerformanceAnalysis.$inferInsert;

export type OptimizationInsightRow = typeof optimizationInsights.$inferSelect;
export type NewOptimizationInsightRow = typeof optimizationInsights.$inferInsert;

export type OptimizationLearningRow = typeof optimizationLearning.$inferSelect;
export type NewOptimizationLearningRow = typeof optimizationLearning.$inferInsert;

export type ExperimentRow = typeof experiments.$inferSelect;
export type NewExperimentRow = typeof experiments.$inferInsert;

// ====================================================
// Phase 12: Autonomous Campaign Optimization & Execution Engine Tables
// ====================================================

export const optimizationActions = pgTable(
  'optimization_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    reelId: uuid('reel_id').references(() => reelProductionPlans.id, {
      onDelete: 'set null'
    }),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    targetEntity: varchar('target_entity', { length: 255 }).notNull(),
    reason: text('reason').notNull(),
    evidence: text('evidence').notNull(),
    confidence: real('confidence').notNull().default(0.85),
    expectedImpact: varchar('expected_impact', { length: 255 }).notNull(),
    sourceMetrics: jsonb('source_metrics').$type<Record<string, unknown>>().default({}),
    status: varchar('status', { length: 50 }).notNull().default('PROPOSED'),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('opt_actions_workspace_id_idx').on(table.workspaceId),
    index('opt_actions_brand_id_idx').on(table.brandId),
    index('opt_actions_campaign_id_idx').on(table.campaignId),
    index('opt_actions_reel_id_idx').on(table.reelId),
    index('opt_actions_status_idx').on(table.status),
    index('opt_actions_type_idx').on(table.actionType)
  ]
);

export const optimizationActionsRelations = relations(optimizationActions, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [optimizationActions.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [optimizationActions.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [optimizationActions.campaignId],
    references: [campaigns.id]
  }),
  reelPlan: one(reelProductionPlans, {
    fields: [optimizationActions.reelId],
    references: [reelProductionPlans.id]
  }),
  executionHistory: many(optimizationExecutionHistory)
}));

export const optimizationExecutionHistory = pgTable(
  'optimization_execution_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    actionId: uuid('action_id')
      .notNull()
      .references(() => optimizationActions.id, { onDelete: 'cascade' }),
    executedBy: varchar('executed_by', { length: 100 }).notNull().default('SYSTEM'),
    executionStatus: varchar('execution_status', { length: 50 }).notNull().default('SUCCESS'),
    executionResult: jsonb('execution_result').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('opt_exec_history_workspace_id_idx').on(table.workspaceId),
    index('opt_exec_history_brand_id_idx').on(table.brandId),
    index('opt_exec_history_action_id_idx').on(table.actionId),
    index('opt_exec_history_status_idx').on(table.executionStatus)
  ]
);

export const optimizationExecutionHistoryRelations = relations(
  optimizationExecutionHistory,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [optimizationExecutionHistory.workspaceId],
      references: [workspaces.id]
    }),
    brand: one(brands, {
      fields: [optimizationExecutionHistory.brandId],
      references: [brands.id]
    }),
    action: one(optimizationActions, {
      fields: [optimizationExecutionHistory.actionId],
      references: [optimizationActions.id]
    })
  })
);

export const campaignDirectorRuns = pgTable(
  'campaign_director_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    summary: text('summary').notNull(),
    winningPatterns: jsonb('winning_patterns').$type<string[]>().default([]),
    weakPatterns: jsonb('weak_patterns').$type<string[]>().default([]) ,
    strategicDirectives: jsonb('strategic_directives').$type<string[]>().default([]),
    contentRequirements: jsonb('content_requirements').$type<Array<Record<string, unknown>>>().default([]),
    proposedActionIds: jsonb('proposed_action_ids').$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('campaign_director_runs_workspace_id_idx').on(table.workspaceId),
    index('campaign_director_runs_brand_id_idx').on(table.brandId),
    index('campaign_director_runs_campaign_id_idx').on(table.campaignId)
  ]
);

export const campaignDirectorRunsRelations = relations(campaignDirectorRuns, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [campaignDirectorRuns.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [campaignDirectorRuns.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [campaignDirectorRuns.campaignId],
    references: [campaigns.id]
  })
}));

// Inferred Types (Phase 12)
export type OptimizationActionRow = typeof optimizationActions.$inferSelect;
export type NewOptimizationActionRow = typeof optimizationActions.$inferInsert;

export type OptimizationExecutionHistoryRow = typeof optimizationExecutionHistory.$inferSelect;
export type NewOptimizationExecutionHistoryRow = typeof optimizationExecutionHistory.$inferInsert;

export type CampaignDirectorRunRow = typeof campaignDirectorRuns.$inferSelect;
export type NewCampaignDirectorRunRow = typeof campaignDirectorRuns.$inferInsert;

// ==========================================
// Phase 13: Autonomous Operations Tables
// ==========================================

// Autonomous Policies Table
export const autonomousPolicies = pgTable(
  'autonomous_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    mode: varchar('mode', { length: 50 }).notNull().default('CONTROLLED'),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    advertising: jsonb('advertising')
      .$type<{
        enabled: boolean;
        maxDailySpend: number;
        maxCampaignSpend: number;
        maxCampaignsPerDay: number;
        maxNewAdsPerDay: number;
      }>()
      .notNull()
      .default({
        enabled: true,
        maxDailySpend: 50,
        maxCampaignSpend: 250,
        maxCampaignsPerDay: 3,
        maxNewAdsPerDay: 10
      }),
    content: jsonb('content')
      .$type<{
        maxReelsPerDay: number;
        maxReelsPerCampaign: number;
      }>()
      .notNull()
      .default({
        maxReelsPerDay: 10,
        maxReelsPerCampaign: 30
      }),
    optimization: jsonb('optimization')
      .$type<{
        autoApply: boolean;
        allowedActions: string[];
      }>()
      .notNull()
      .default({
        autoApply: true,
        allowedActions: [
          'CHANGE_HOOK',
          'CHANGE_MESSAGING_ANGLE',
          'CHANGE_CTA',
          'CHANGE_CONTENT_PILLAR',
          'CHANGE_DURATION',
          'CHANGE_VISUAL_STYLE',
          'CREATE_VARIANT',
          'REPLACE_CREATIVE',
          'PAUSE_RECOMMENDATION'
        ]
      }),
    targeting: jsonb('targeting')
      .$type<{
        allowedCountries: string[];
        allowedAgeRange: { min?: number; max?: number };
        allowedPlacements: string[];
      }>()
      .notNull()
      .default({
        allowedCountries: [],
        allowedAgeRange: {},
        allowedPlacements: []
      }),
    brand: jsonb('brand')
      .$type<{
        enforceBrandRules: boolean;
        enforceBrandColors: boolean;
        enforceApprovedAssets: boolean;
      }>()
      .notNull()
      .default({
        enforceBrandRules: true,
        enforceBrandColors: true,
        enforceApprovedAssets: true
      }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('autonomous_policies_workspace_id_idx').on(table.workspaceId),
    index('autonomous_policies_mode_idx').on(table.mode),
    index('autonomous_policies_status_idx').on(table.status)
  ]
);

export const autonomousPoliciesRelations = relations(autonomousPolicies, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autonomousPolicies.workspaceId],
    references: [workspaces.id]
  })
}));

// Autonomous Runs Table
export const autonomousRuns = pgTable(
  'autonomous_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    triggerType: varchar('trigger_type', { length: 50 }).notNull().default('SCHEDULED'),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    currentStep: varchar('current_step', { length: 100 }),
    policySnapshot: jsonb('policy_snapshot').$type<Record<string, unknown>>(),
    summary: text('summary'),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
    error: text('error'),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('autonomous_runs_workspace_id_idx').on(table.workspaceId),
    index('autonomous_runs_brand_id_idx').on(table.brandId),
    index('autonomous_runs_campaign_id_idx').on(table.campaignId),
    index('autonomous_runs_status_idx').on(table.status),
    uniqueIndex('autonomous_runs_idempotency_key_idx').on(table.idempotencyKey)
  ]
);

export const autonomousRunsRelations = relations(autonomousRuns, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [autonomousRuns.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [autonomousRuns.brandId],
    references: [brands.id]
  }),
  campaign: one(campaigns, {
    fields: [autonomousRuns.campaignId],
    references: [campaigns.id]
  }),
  steps: many(autonomousRunSteps)
}));

// Autonomous Run Steps Table
export const autonomousRunSteps = pgTable(
  'autonomous_run_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => autonomousRuns.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    stepName: varchar('step_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    inputPayload: jsonb('input_payload').$type<Record<string, unknown>>().default({}),
    outputPayload: jsonb('output_payload').$type<Record<string, unknown>>().default({}),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('autonomous_run_steps_run_id_idx').on(table.runId),
    index('autonomous_run_steps_workspace_id_idx').on(table.workspaceId),
    index('autonomous_run_steps_step_name_idx').on(table.stepName),
    index('autonomous_run_steps_status_idx').on(table.status)
  ]
);

export const autonomousRunStepsRelations = relations(autonomousRunSteps, ({ one }) => ({
  run: one(autonomousRuns, {
    fields: [autonomousRunSteps.runId],
    references: [autonomousRuns.id]
  }),
  workspace: one(workspaces, {
    fields: [autonomousRunSteps.workspaceId],
    references: [workspaces.id]
  })
}));

// Autonomous Execution History Table (Immutable Audit Log)
export const autonomousExecutionHistory = pgTable(
  'autonomous_execution_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => autonomousRuns.id, { onDelete: 'set null' }),
    actionType: varchar('action_type', { length: 100 }).notNull(),
    targetEntity: varchar('target_entity', { length: 100 }).notNull(),
    targetId: varchar('target_id', { length: 255 }),
    status: varchar('status', { length: 50 }).notNull().default('SUCCESS'),
    reason: text('reason').notNull(),
    budgetImpact: real('budget_impact').notNull().default(0),
    executionResult: jsonb('execution_result').$type<Record<string, unknown>>().default({}),
    errorInformation: text('error_information'),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    executedBy: varchar('executed_by', { length: 100 }).notNull().default('AUTONOMOUS_ENGINE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('auton_exec_history_workspace_id_idx').on(table.workspaceId),
    index('auton_exec_history_brand_id_idx').on(table.brandId),
    index('auton_exec_history_run_id_idx').on(table.runId),
    index('auton_exec_history_action_type_idx').on(table.actionType),
    index('auton_exec_history_status_idx').on(table.status)
  ]
);

export const autonomousExecutionHistoryRelations = relations(autonomousExecutionHistory, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autonomousExecutionHistory.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [autonomousExecutionHistory.brandId],
    references: [brands.id]
  }),
  run: one(autonomousRuns, {
    fields: [autonomousExecutionHistory.runId],
    references: [autonomousRuns.id]
  })
}));

// Autonomous Limits Table (Daily Workspace Usage Tracker)
export const autonomousLimits = pgTable(
  'autonomous_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 20 }).notNull(), // 'YYYY-MM-DD'
    dailySpend: real('daily_spend').notNull().default(0),
    campaignsCreated: integer('campaigns_created').notNull().default(0),
    adsCreated: integer('ads_created').notNull().default(0),
    reelsCreated: integer('reels_created').notNull().default(0),
    reelsRendered: integer('reels_rendered').notNull().default(0),
    reelsPublished: integer('reels_published').notNull().default(0),
    optimizationsApplied: integer('optimizations_applied').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('auton_limits_ws_date_idx').on(table.workspaceId, table.date),
    index('auton_limits_workspace_id_idx').on(table.workspaceId),
    index('auton_limits_date_idx').on(table.date)
  ]
);

export const autonomousLimitsRelations = relations(autonomousLimits, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autonomousLimits.workspaceId],
    references: [workspaces.id]
  })
}));

// Autonomous Budget Events Table
export const autonomousBudgetEvents = pgTable(
  'autonomous_budget_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    amount: real('amount').notNull().default(0),
    limitValue: real('limit_value').notNull().default(0),
    currentValue: real('current_value').notNull().default(0),
    reason: text('reason').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('auton_budget_events_workspace_id_idx').on(table.workspaceId),
    index('auton_budget_events_brand_id_idx').on(table.brandId),
    index('auton_budget_events_event_type_idx').on(table.eventType)
  ]
);

export const autonomousBudgetEventsRelations = relations(autonomousBudgetEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autonomousBudgetEvents.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [autonomousBudgetEvents.brandId],
    references: [brands.id]
  })
}));

// Autonomous Safety Events Table
export const autonomousSafetyEvents = pgTable(
  'autonomous_safety_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    severity: varchar('severity', { length: 50 }).notNull().default('WARNING'),
    description: text('description').notNull(),
    blockedAction: varchar('blocked_action', { length: 100 }),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
    resolved: varchar('resolved', { length: 10 }).notNull().default('NO'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('auton_safety_events_workspace_id_idx').on(table.workspaceId),
    index('auton_safety_events_brand_id_idx').on(table.brandId),
    index('auton_safety_events_event_type_idx').on(table.eventType),
    index('auton_safety_events_severity_idx').on(table.severity)
  ]
);

export const autonomousSafetyEventsRelations = relations(autonomousSafetyEvents, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [autonomousSafetyEvents.workspaceId],
    references: [workspaces.id]
  }),
  brand: one(brands, {
    fields: [autonomousSafetyEvents.brandId],
    references: [brands.id]
  })
}));

// Inferred Types (Phase 13)
export type AutonomousPolicyRow = typeof autonomousPolicies.$inferSelect;
export type NewAutonomousPolicyRow = typeof autonomousPolicies.$inferInsert;

export type AutonomousRunRow = typeof autonomousRuns.$inferSelect;
export type NewAutonomousRunRow = typeof autonomousRuns.$inferInsert;

export type AutonomousRunStepRow = typeof autonomousRunSteps.$inferSelect;
export type NewAutonomousRunStepRow = typeof autonomousRunSteps.$inferInsert;

export type AutonomousExecutionHistoryRow = typeof autonomousExecutionHistory.$inferSelect;
export type NewAutonomousExecutionHistoryRow = typeof autonomousExecutionHistory.$inferInsert;

export type AutonomousLimitsRow = typeof autonomousLimits.$inferSelect;
export type NewAutonomousLimitsRow = typeof autonomousLimits.$inferInsert;

export type AutonomousBudgetEventRow = typeof autonomousBudgetEvents.$inferSelect;
export type NewAutonomousBudgetEventRow = typeof autonomousBudgetEvents.$inferInsert;

export type AutonomousSafetyEventRow = typeof autonomousSafetyEvents.$inferSelect;
export type NewAutonomousSafetyEventRow = typeof autonomousSafetyEvents.$inferInsert;

// ==========================================
// Phase 15: SaaS Commercialization & Billing Tables
// ==========================================

// Workspace Subscriptions Table
export const workspaceSubscriptions = pgTable(
  'workspace_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    tier: varchar('tier', { length: 50 }).notNull().default('FREE'),
    status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('workspace_subscriptions_workspace_id_idx').on(table.workspaceId),
    index('workspace_subscriptions_tier_idx').on(table.tier),
    index('workspace_subscriptions_status_idx').on(table.status),
    index('workspace_subscriptions_stripe_customer_id_idx').on(table.stripeCustomerId)
  ]
);

export const workspaceSubscriptionsRelations = relations(workspaceSubscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceSubscriptions.workspaceId],
    references: [workspaces.id]
  })
}));

// Workspace Usage Records Table (Aggregated per billing period month YYYY-MM)
export const workspaceUsageRecords = pgTable(
  'workspace_usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    periodMonth: varchar('period_month', { length: 7 }).notNull(), // 'YYYY-MM'
    reelsGenerated: integer('reels_generated').notNull().default(0),
    reelsRendered: integer('reels_rendered').notNull().default(0),
    reelsPublished: integer('reels_published').notNull().default(0),
    campaignsCreated: integer('campaigns_created').notNull().default(0),
    storageUsedBytes: bigint('storage_used_bytes', { mode: 'number' }).notNull().default(0),
    metaAdsSpend: real('meta_ads_spend').notNull().default(0),
    aiTokensUsed: integer('ai_tokens_used').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('workspace_usage_records_workspace_id_idx').on(table.workspaceId),
    index('workspace_usage_records_period_month_idx').on(table.periodMonth),
    uniqueIndex('workspace_usage_workspace_period_unique').on(table.workspaceId, table.periodMonth)
  ]
);

export const workspaceUsageRecordsRelations = relations(workspaceUsageRecords, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceUsageRecords.workspaceId],
    references: [workspaces.id]
  })
}));

// Billing Invoices Table
export const billingInvoices = pgTable(
  'billing_invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).notNull().unique(),
    amountDueUsd: real('amount_due_usd').notNull().default(0),
    amountPaidUsd: real('amount_paid_usd').notNull().default(0),
    status: varchar('status', { length: 50 }).notNull().default('PAID'),
    invoiceUrl: text('invoice_url'),
    pdfUrl: text('pdf_url'),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('billing_invoices_workspace_id_idx').on(table.workspaceId),
    index('billing_invoices_stripe_invoice_id_idx').on(table.stripeInvoiceId),
    index('billing_invoices_status_idx').on(table.status)
  ]
);

export const billingInvoicesRelations = relations(billingInvoices, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [billingInvoices.workspaceId],
    references: [workspaces.id]
  })
}));

// Inferred Types (Phase 15)
export type WorkspaceSubscriptionRow = typeof workspaceSubscriptions.$inferSelect;
export type NewWorkspaceSubscriptionRow = typeof workspaceSubscriptions.$inferInsert;

export type WorkspaceUsageRecordRow = typeof workspaceUsageRecords.$inferSelect;
export type NewWorkspaceUsageRecordRow = typeof workspaceUsageRecords.$inferInsert;

export type BillingInvoiceRow = typeof billingInvoices.$inferSelect;
export type NewBillingInvoiceRow = typeof billingInvoices.$inferInsert;

// ==========================================
// Google Veo 3.1 AI Video Operations Table
// ==========================================
export const aiVideoOperations = pgTable(
  'ai_video_operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull().default('google-veo'),
    model: varchar('model', { length: 100 }).notNull().default('veo-3.1-generate-preview'),
    operationId: varchar('operation_id', { length: 255 }).notNull().unique(),
    reelPlanId: uuid('reel_plan_id'),
    sceneNumber: integer('scene_number'),
    status: varchar('status', { length: 50 }).notNull().default('SUBMITTED'), // SUBMITTED | POLLING | COMPLETED | FAILED
    prompt: text('prompt').notNull(),
    referenceAssetIds: jsonb('reference_asset_ids').$type<string[]>().default([]),
    outputStorageKey: text('output_storage_key'),
    outputUrl: text('output_url'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    error: jsonb('error').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true })
  },
  (table) => [
    index('ai_video_operations_operation_id_idx').on(table.operationId),
    index('ai_video_operations_status_idx').on(table.status),
    index('ai_video_operations_reel_plan_id_idx').on(table.reelPlanId),
    index('ai_video_operations_workspace_id_idx').on(table.workspaceId)
  ]
);

export const aiVideoOperationsRelations = relations(aiVideoOperations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [aiVideoOperations.workspaceId],
    references: [workspaces.id]
  })
}));

export type AIVideoOperationRow = typeof aiVideoOperations.$inferSelect;
export type NewAIVideoOperationRow = typeof aiVideoOperations.$inferInsert;




