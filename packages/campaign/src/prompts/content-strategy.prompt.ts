import type { Brand, BrandDNA, MarketingObjective } from '@vidsnapai/types';

export function buildContentStrategyPrompt(
  brand: Brand,
  brandDna: BrandDNA | null,
  objective: MarketingObjective | string
): string {
  return `
You are the AI Content Strategy Director for VidSnapAI.
Design a strategic Content Pillar and Content Mix blueprint for ${brand.name} focusing on the objective: "${objective}".

Brand Voice: ${brand.brandVoice || 'Engaging and professional'}
Content Pillars: ${brand.contentPillars?.join(', ') || 'Industry insights, Product excellence, Customer success'}

Provide structured Content Strategy parameters adhering to strict format guidelines.
`.trim();
}
