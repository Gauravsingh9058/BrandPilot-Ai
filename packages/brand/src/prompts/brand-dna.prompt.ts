import type { Brand, BrandProduct, BrandAsset } from '@vidsnapai/types';

export function buildBrandDnaPrompt(
  brand: Brand,
  products: BrandProduct[],
  assets: BrandAsset[]
): string {
  const logoAsset = assets.find((a) => a.type === 'logo');

  return `
You are the VidSnapAI Brand Intelligence Engine.
Analyze the following brand profile, its products/services, target audience, and marketing rules to construct a structured, comprehensive, and high-converting "Brand DNA" object.

Brand Profile:
- Name: ${brand.name}
- Industry: ${brand.industry}
- Description: ${brand.description}
- Website: ${brand.websiteUrl || 'N/A'}
- Brand Story: ${brand.story || 'N/A'}
- Target Audience Overview: ${brand.targetAudience || 'N/A'}
- Brand Voice: ${brand.brandVoice || 'Professional, energetic, authoritative'}
- Brand Personality: ${brand.brandPersonality || 'Innovative, approachable'}
- Unique Selling Points: ${JSON.stringify(brand.uniqueSellingPoints || [])}
- Primary CTA: ${brand.primaryCta || 'Learn More'}
- Offers: ${JSON.stringify(brand.offers || [])}
- Content Pillars: ${JSON.stringify(brand.contentPillars || [])}
- Brand Colors: ${JSON.stringify(brand.brandColors || {})}
- Typography: ${JSON.stringify(brand.typography || {})}
- Marketing Rules: ${JSON.stringify(brand.marketingRules || {})}
- Competitor References: ${JSON.stringify(brand.competitorReferences || [])}

Product Catalog (${products.length} items):
${products
  .map(
    (p, i) => `
[Product ${i + 1}]
- Name: ${p.name}
- Category: ${p.category || 'General'}
- Description: ${p.description}
- Price: ${p.price !== null && p.price !== undefined ? `${p.currency || 'USD'} ${p.price}` : 'N/A'}
- Features: ${JSON.stringify(p.features || [])}
- Benefits: ${JSON.stringify(p.benefits || [])}
- USPs: ${JSON.stringify(p.usps || [])}
- Target Audience: ${p.targetAudience || 'General'}
- CTA: ${p.cta || 'Get Started'}
`
  )
  .join('\n')}

Logo / Asset references:
- Logo URL: ${logoAsset?.url || 'N/A'}

INSTRUCTIONS:
Synthesize all input data and produce a complete JSON response matching the required Brand DNA schema:
1. "identity": Synthesize brandName, industry, rich story narrative, crisp mission statement, and 3-5 distinct personality traits.
2. "audience": Define primaryAudience, demographics, 3-5 core customer pain points, 3-5 desires, and 3-5 emotional/rational buying motivations.
3. "messaging": Formulate positioning statement, core message, strong value proposition, 3-5 USPs, 3-5 proof points, tone keywords, and forbidden messaging rules.
4. "products": An array of normalized products including benefits, features, USPs, target audience, offers, and CTA.
5. "visualIdentity": Colors (primary, secondary, accent), typography (headingFont, bodyFont), visualStyle description, and imageStyle recommendations.
6. "contentStrategy": 4-6 strategic contentPillars, preferredTopics, educationalTopics, promotionalTopics, storytellingTopics.
7. "promotionRules": primaryCTA, active offers, claimsToAvoid (regulatory/brand safety), complianceRules, brandRestrictions.

Return pure structured JSON matching the BrandDNA schema.
`.trim();
}
