import type {
  BrandDna,
  MarketingStrategy,
  CampaignStrategy,
  ReelProductionPlan,
  ReelProductionPackage,
  GenerateAnimationPlanInput
} from '@vidsnapai/types';

export function buildAnimationIntelligencePrompt(params: {
  brandDna?: BrandDna | null;
  marketingStrategy?: MarketingStrategy | null;
  campaignStrategy?: CampaignStrategy | null;
  reelPlan: ReelProductionPlan;
  productionPackage: ReelProductionPackage;
  options?: GenerateAnimationPlanInput;
}): string {
  const { brandDna, marketingStrategy, campaignStrategy, reelPlan, productionPackage, options } = params;

  const primaryColors = brandDna?.visualIdentity?.colors?.primary || '#6366F1';
  const secondaryColors = brandDna?.visualIdentity?.colors?.secondary || '#EC4899';
  const fonts = brandDna?.visualIdentity?.typography?.bodyFont || 'Outfit, sans-serif';
  const toneVoice = brandDna?.messaging?.tone?.join(', ') || 'Professional, modern, cinematic';

  const scenesText = reelPlan.scenes
    .map((s) => {
      return `--- Scene #${s.sceneNumber} (${s.durationSeconds}s) ---
Purpose: ${s.purpose}
Visual Type: ${s.visualType}
Subject / Environment: ${s.subject} | ${s.environment}
Narration: "${s.narration}"
On-Screen Text: "${s.onScreenText}"
Animation Intent from Script: ${s.animationIntent || 'None'}
Product Ref: ${s.productReference || 'None'}
Brand Element: ${s.brandElement || 'None'}`;
    })
    .join('\n\n');

  const captionCues = productionPackage?.packagePayload?.captionTrack?.cues || (productionPackage as any)?.captions || [];
  const captionSummary = captionCues
    .slice(0, 15)
    .map((c: any) => `[${(c.startTime || 0).toFixed(2)}s - ${(c.endTime || 0).toFixed(2)}s]: "${c.text}" (emphasis: ${c.emphasis || 'none'})`)
    .join('\n');

  const sfxSummary = ((productionPackage?.packagePayload?.audioMixPlan as any)?.sfxConfigs || [])
    .map((sfx: any) => `[${(sfx.startTime || 0).toFixed(2)}s]: SFX "${sfx.name}" (${sfx.type})`)
    .join('\n');

  const musicMood = (productionPackage?.packagePayload?.audioMixPlan as any)?.musicConfig?.mood || 'dynamic upbeat';

  return `You are VidSnapAI's Senior Creative Animation Director & Motion Intelligence Engine.

Your mission is to generate a comprehensive, director-grade, deterministic ANIMATION PLAN for this vertical video (9:16 Reel/TikTok/Short).
You MUST decide:
1. What moves, when, why, and how fast.
2. Kinetic typography synchronized with voice speech and key emphasis words.
3. Camera choreography (slow push, dynamic pull, parallax drift, hero focus).
4. Product reveal moments and hero product animations.
5. Logo reveals respecting brand identity without distortion.
6. Semantic transitions (cuts, crossfades, whip pans, light wipes) that match narrative rhythm.
7. Audio & SFX synchronization cues.

DO NOT output raw video or FFmpeg scripts. You are producing the structured AnimationPlan blueprint.

==================== BRAND IDENTITY & DNA ====================
Name: ${reelPlan.concept?.title || 'Brand'}
Tone of Voice: ${toneVoice}
Brand Colors: ${primaryColors}, ${secondaryColors}
Typography: ${fonts}
Brand Restrictions: ${JSON.stringify(brandDna?.promotionRules?.brandRestrictions || [])}

==================== MARKETING & CAMPAIGN OBJECTIVE ====================
Objective: ${reelPlan.objective}
Target Audience: ${reelPlan.audience}
Funnel Stage: ${reelPlan.funnelStage}
Campaign Objective: ${marketingStrategy?.objective || campaignStrategy?.objective || 'High-conversion brand growth'}
Mode: ${options?.mode || 'BRAND_PROMOTION'}
Requested Animation Language: ${options?.animationLanguage || 'CINEMATIC'}
Requested Intensity: ${options?.intensity || 'MEDIUM'}
Reduced Motion: ${options?.reducedMotion ? 'YES (keep motion subtle and accessible)' : 'NO'}
Custom Guidance: ${options?.customGuidance || 'None'}

==================== REEL SCRIPT & SCENES ====================
Total Duration: ${reelPlan.durationSeconds}s
Hook: "${reelPlan.hook?.text || ''}" (${reelPlan.hook?.type || 'PROBLEM'})
CTA: "${reelPlan.cta?.text || ''}" (${reelPlan.cta?.type || 'SHOP_NOW'})

${scenesText}

==================== AUDIO & CAPTION TIMINGS ====================
Music Mood: ${musicMood}
SFX Cues:
${sfxSummary || 'No specific SFX cues listed'}

Caption Track Sample:
${captionSummary || 'Standard speech timing'}

==================== INSTRUCTIONS & CONSTRAINTS ====================
1. Respect scene time boundaries! Scene startTime and endTime must accurately sum to the reel duration.
2. Synchronize kinetic typography word pops/highlights with speech emphasis and SFX hit timings.
3. First Scene (Hook): High attention retention, rapid text entrance, subtle camera push.
4. Product Scenes: If a scene features a product, include a ProductAnimation (CLEAN_REVEAL, HERO_REVEAL, or DETAIL_REVEAL).
5. CTA Scene: Build a climax CTAAnimation / text pulse with high priority.
6. Rhythm: HOOK (Attention) -> PROBLEM (Tension) -> SOLUTION/PRODUCT (Reveal) -> BENEFIT (Emphasis) -> CTA (Climax).
7. Transitions: Use CUT or CROSSFADE by default. Use WHIP or LIGHT_WIPE only when justified by tone or SFX.
8. NEVER invent new brand claims or distort approved text.

Respond ONLY with valid JSON matching the AnimationAIOutput schema.`;
}
