import type {
  Brand,
  BrandProduct,
  ContentJob,
  ReelScene
} from '@vidsnapai/types';
import type { ReelAIOutput } from '@vidsnapai/validation';
import { validateScenes } from './sceneValidator.js';

export interface ReelValidationResult {
  valid: boolean;
  sanitizedOutput: ReelAIOutput;
  calculatedDuration: number;
  wordCount: number;
  errors: string[];
  warnings: string[];
  complianceNotes: string[];
  warningFlags: string[];
}

export function validateAndSanitizeReel(
  rawOutput: ReelAIOutput,
  context: {
    targetDurationSeconds: number;
    brand: Brand;
    products?: BrandProduct[];
    contentJob: ContentJob;
  }
): ReelValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const complianceNotes: string[] = [];
  const warningFlags: string[] = [];

  const sanitized: ReelAIOutput = JSON.parse(JSON.stringify(rawOutput));

  const targetDuration = context.targetDurationSeconds || 30;

  // 1. Scene Validation with target duration requirement
  const sceneValidation = validateScenes(sanitized.scenes as ReelScene[], {
    targetDurationSeconds: targetDuration
  });
  errors.push(...sceneValidation.errors);
  warnings.push(...sceneValidation.warnings);

  // 2. Duration Sum Calculation & Strict Tolerance Check (within 0.5s)
  const calculatedDuration = (sanitized.scenes as ReelScene[]).reduce(
    (acc: number, scene: ReelScene) => acc + (scene.durationSeconds || 0),
    0
  );
  const diff = Math.abs(calculatedDuration - targetDuration);

  // Enforce hard validation requirement: scene durations must sum within 0.5 sec of target duration
  if (diff > 0.5) {
    errors.push(
      `Total scene duration (${calculatedDuration.toFixed(1)}s) must sum within 0.5s of target duration (${targetDuration}s)`
    );
  } else if (diff > 0.001 && sanitized.scenes && sanitized.scenes.length > 0) {
    // Automatically balance minor drift on last scene to match exactly
    const lastScene = sanitized.scenes[sanitized.scenes.length - 1] as ReelScene;
    lastScene.durationSeconds = Number((lastScene.durationSeconds + (targetDuration - calculatedDuration)).toFixed(2));
  }

  // 3. Hook Verification
  if (!sanitized.hook || !sanitized.hook.text || sanitized.hook.text.trim() === '') {
    errors.push('Hook is missing or empty');
  }

  // 4. CTA Verification
  if (!sanitized.cta || !sanitized.cta.text || sanitized.cta.text.trim() === '') {
    errors.push('Call-to-Action (CTA) is missing or empty');
  }

  // 5. Calculate Word Count
  let totalWords = 0;
  (sanitized.scenes as ReelScene[]).forEach((scene: ReelScene) => {
    if (scene.narration) {
      totalWords += scene.narration.trim().split(/\s+/).filter(Boolean).length;
    }
  });

  // Typical speaking rate is ~2.5 words per second
  const maxComfortableWords = calculatedDuration * 3.2;
  if (totalWords > maxComfortableWords) {
    warnings.push(
      `Narration word count (${totalWords} words) may be too dense for ${calculatedDuration.toFixed(0)}s video (recommended max: ${Math.round(maxComfortableWords)})`
    );
    warningFlags.push('HIGH_NARRATION_DENSITY');
  }

  // 6. Repetition Detection
  const sceneTexts = (sanitized.scenes as ReelScene[])
    .map((s: ReelScene) => s.onScreenText?.toLowerCase().trim() || '')
    .filter(Boolean);
  const uniqueTexts = new Set(sceneTexts);
  if (sceneTexts.length > uniqueTexts.size) {
    warnings.push('Duplicate on-screen text detected across multiple scenes');
    warningFlags.push('REPEATED_ONSCREEN_TEXT');
  }

  // 7. Guardrail & Hallucination Inspection
  const claimsToAvoid = context.brand.marketingRules?.claimsToAvoid || [];
  const brandRestrictions = context.brand.marketingRules?.brandRestrictions || [];

  const allScriptText = [
    sanitized.narrative,
    sanitized.hook?.text,
    ...(sanitized.scenes as ReelScene[]).map((s: ReelScene) => `${s.narration} ${s.onScreenText}`)
  ].join(' ');

  // Check claims to avoid
  claimsToAvoid.forEach((forbiddenClaim: string) => {
    if (forbiddenClaim && allScriptText.toLowerCase().includes(forbiddenClaim.toLowerCase())) {
      complianceNotes.push(`Enforced guardrail: removed or flagged forbidden claim "${forbiddenClaim}"`);
      warningFlags.push(`GUARDRAIL_FLAG_${forbiddenClaim.toUpperCase().replace(/\s+/g, '_')}`);
    }
  });

  brandRestrictions.forEach((restriction: string) => {
    if (restriction && allScriptText.toLowerCase().includes(restriction.toLowerCase())) {
      complianceNotes.push(`Enforced restriction: "${restriction}"`);
    }
  });

  // Check for hallucinated pricing/discounts if no product price was provided
  const knownProducts = context.products || [];
  const hasKnownPricing = knownProducts.some((p: BrandProduct) => p.price && String(p.price).length > 0);
  const priceRegex = /\$\d+(\.\d{2})?|\b\d+%\s+off\b|\bguaranteed\s+(returns|cure|profit)\b/i;

  if (!hasKnownPricing && priceRegex.test(allScriptText)) {
    warningFlags.push('UNSUPPORTED_COMMERCIAL_CLAIM');
    complianceNotes.push('Detected commercial or guarantee claim not in source product data. Replaced with neutral benefit indicator.');

    // Sanitize script segments and scenes if unverified guarantees were written
    sanitized.scenes = (sanitized.scenes as ReelScene[]).map((s: ReelScene) => ({
      ...s,
      narration: s.narration ? s.narration.replace(priceRegex, '[PRODUCT BENEFIT REQUIRED]') : '',
      onScreenText: s.onScreenText ? s.onScreenText.replace(priceRegex, '[PRODUCT BENEFIT REQUIRED]') : ''
    }));
  }

  return {
    valid: errors.length === 0,
    sanitizedOutput: sanitized,
    calculatedDuration,
    wordCount: totalWords,
    errors,
    warnings,
    complianceNotes,
    warningFlags
  };
}
