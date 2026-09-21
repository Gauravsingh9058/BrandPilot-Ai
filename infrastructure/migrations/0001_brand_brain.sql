-- VidSnapAI Phase 2: Brand Brain Migration

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"website_url" varchar(500),
	"story" text,
	"industry" varchar(100) NOT NULL,
	"target_audience" text,
	"brand_voice" varchar(255),
	"brand_personality" varchar(255),
	"unique_selling_points" jsonb DEFAULT '[]'::jsonb,
	"pricing_info" jsonb,
	"offers" jsonb DEFAULT '[]'::jsonb,
	"primary_cta" varchar(255),
	"social_links" jsonb,
	"brand_colors" jsonb,
	"typography" jsonb,
	"content_pillars" jsonb DEFAULT '[]'::jsonb,
	"marketing_rules" jsonb,
	"competitor_references" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brand_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100),
	"price" integer,
	"currency" varchar(10) DEFAULT 'USD',
	"features" jsonb DEFAULT '[]'::jsonb,
	"benefits" jsonb DEFAULT '[]'::jsonb,
	"usps" jsonb DEFAULT '[]'::jsonb,
	"target_audience" text,
	"offer_info" jsonb,
	"cta" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brand_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brand_dna" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"identity" jsonb NOT NULL,
	"audience" jsonb NOT NULL,
	"messaging" jsonb NOT NULL,
	"products" jsonb NOT NULL,
	"visual_identity" jsonb NOT NULL,
	"content_strategy" jsonb NOT NULL,
	"promotion_rules" jsonb NOT NULL,
	"generated_by" varchar(100) DEFAULT 'ai-gemini' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "brands" ADD CONSTRAINT "brands_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "brand_products" ADD CONSTRAINT "brand_products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "brand_assets" ADD CONSTRAINT "brand_assets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "brand_dna" ADD CONSTRAINT "brand_dna_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brands_workspace_id_idx" ON "brands" USING btree ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "brands_workspace_slug_unique_idx" ON "brands" USING btree ("workspace_id", "slug");
CREATE INDEX IF NOT EXISTS "brand_products_brand_id_idx" ON "brand_products" USING btree ("brand_id");
CREATE INDEX IF NOT EXISTS "brand_assets_brand_id_idx" ON "brand_assets" USING btree ("brand_id");
CREATE INDEX IF NOT EXISTS "brand_dna_brand_id_idx" ON "brand_dna" USING btree ("brand_id");
CREATE UNIQUE INDEX IF NOT EXISTS "brand_dna_brand_version_unique_idx" ON "brand_dna" USING btree ("brand_id", "version");
