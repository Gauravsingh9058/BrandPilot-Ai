import type {
  Brand,
  BrandDna,
  BrandProduct,
  BrandAsset,
  MarketingStrategy,
  Campaign,
  ContentJob,
  OptimizationContext,
  ReelScene,
  ScriptSegment,
  SceneVisualType
} from '@vidsnapai/types';
import type { ReelAIOutput } from '@vidsnapai/validation';
import { VeoReferenceAssetResolver } from '@vidsnapai/media';

export interface DirectorContext {
  brand: Brand;
  brandDna?: BrandDna | null;
  product?: BrandProduct | null;
  products?: BrandProduct[];
  marketingStrategy?: MarketingStrategy | null;
  campaign?: Campaign | null;
  contentJob: ContentJob;
  optimizationContext?: OptimizationContext;
  brandAssets?: BrandAsset[];
  productAssets?: BrandAsset[];
  targetDurationSeconds?: number;
  aspectRatio?: string;
  platform?: string;
  format?: string;
}

export class ReelProductionDirector {
  /**
   * Generates an autonomous, highly converting commercial advertisement blueprint
   * strictly grounded in Brand Brain, Product DB, Campaign Strategy, and Performance Intelligence.
   */
  public static directCommercialBlueprint(context: DirectorContext): ReelAIOutput {
    const {
      brand,
      brandDna,
      product,
      products = [],
      marketingStrategy: _marketingStrategy,
      campaign,
      contentJob,
      optimizationContext,
      brandAssets = [],
      productAssets = [],
      targetDurationSeconds = 30,
      aspectRatio = '9:16',
      platform = 'INSTAGRAM',
      format = 'REEL'
    } = context;

    const targetProduct = product || products[0] || null;
    const productName = targetProduct?.name || brand.name;
    const productFeatures = targetProduct?.features || [];
    const productBenefits = targetProduct?.benefits || [];
    const productUsps = targetProduct?.usps || brand.uniqueSellingPoints || brandDna?.messaging?.usps || [];
    const primaryFeature = productFeatures[0] || productUsps[0] || 'Premium Engineering';
    const primaryBenefit = productBenefits[0] || productUsps[1] || 'Unmatched Performance';
    const brandVoice = brand.brandVoice || brandDna?.messaging?.tone?.join(', ') || 'Empowering, bold, modern';
    const brandPrimaryColor = brand.brandColors?.primary || brandDna?.visualIdentity?.colors?.primary || '#6366F1';
    const brandSecondaryColor = brand.brandColors?.secondary || brandDna?.visualIdentity?.colors?.secondary || '#EC4899';
    const logoAsset = brandAssets.find((a) => a.type === 'LOGO' || a.assetPurpose === 'LOGO');
    const heroProductAsset = productAssets.find(
      (a) => a.assetPurpose === 'HERO' || a.type === 'PRODUCT_IMAGE' || a.type === 'PRODUCT_VIDEO'
    );
    const detailProductAsset = productAssets.find(
      (a) => a.assetPurpose === 'DETAIL' || a.assetPurpose === 'FEATURE'
    ) || heroProductAsset;

    const attachedProductAssetIds = productAssets.map((a) => a.id);

    // 1. Hook Selection & Performance Optimization
    const winningHookIdea = optimizationContext?.winningHooks?.[0];
    const hookText = winningHookIdea || contentJob.hook || `Discover the breakthrough with ${productName}.`;
    const hookType = (contentJob.funnelStage === 'AWARENESS' ? 'PROBLEM' : 'CURIOSITY') as any;

    // 2. Determine Scene Breakdown based on Target Duration
    let scenes: ReelScene[] = [];
    let scriptSegments: ScriptSegment[] = [];

    if (targetDurationSeconds >= 25) {
      // Standard 30-Second Commercial (7 Scenes: 0-4s, 4-8s, 8-13s, 13-18s, 18-23s, 23-27s, 27-30s)
      scenes = [
        {
          sceneNumber: 1,
          durationSeconds: 4.0,
          purpose: 'HOOK',
          narration: hookText,
          onScreenText: hookText.toUpperCase(),
          visualType: 'PRODUCT_SHOWCASE' as SceneVisualType,
          subject: `High-impact reveal of ${productName} with vibrant energy`,
          environment: `Premium modern setting with brand gradient accents (${brandPrimaryColor})`,
          composition: '9:16 vertical centered dynamic close-up',
          camera: 'Fast push-in with 15-degree dynamic Dutch tilt',
          lighting: `High-contrast studio rim lighting with ${brandPrimaryColor} neon highlights`,
          mood: 'High-energy, magnetic, professional',
          transition: 'Dynamic whip cut',
          animationIntent: 'Kinetic pop typography scaling in sync with voiceover',
          assetRequirement: `High-resolution hero shot of ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Immediate visual recognition and hook curiosity',
          veoPrompt: `Cinematic vertical 9:16 commercial opening. Fast dynamic push-in on ${productName}, sharp macro focus, dramatic volumetric rim lighting (${brandPrimaryColor}), clean modern aesthetic, photorealistic 4K texture.`,
          veoNegativePrompt: 'blurry, low resolution, watermark, bad anatomy, text artifacts, CGI glitch, generic mock packaging, distorted logo',
          cameraMovement: 'Fast push-in with subtle rotation',
          motion: 'Dynamic kinetic energy with smooth deceleration',
          productPreservationRules: `Preserve exact packaging silhouette and physical details of ${productName}`,
          brandPreservationRules: `Incorporate brand primary color (${brandPrimaryColor})`,
          textSafeComposition: 'Keep top 20% and bottom 25% clear for captions and interface overlays',
          transitionIntention: 'Whip pan transition to problem context',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: heroProductAsset ? heroProductAsset.id : null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 2,
          durationSeconds: 4.0,
          purpose: 'PROBLEM / DESIRE',
          narration: contentJob.keyMessage || `Tired of settling for ordinary results? Here is what changes everything.`,
          onScreenText: 'THE EVERYDAY STRUGGLE',
          visualType: 'PROBLEM' as SceneVisualType,
          subject: 'Relatable visual representing the customer challenge and friction point',
          environment: 'Everyday lifestyle / workplace environment with moody contrast',
          composition: 'Medium portrait framing with natural depth of field',
          camera: 'Slow tracking dolly shot',
          lighting: 'Moody atmospheric ambient lighting',
          mood: 'Empathetic, authentic, focused',
          transition: 'Match cut to solution',
          animationIntent: 'Subtle text wipe with high-contrast badge backing',
          assetRequirement: 'Lifestyle scene illustrating user pain point and desire for better solution',
          productReference: null,
          brandElement: null,
          emphasis: 'Emotional resonance with audience struggle',
          veoPrompt: `Cinematic 9:16 portrait lifestyle scene. Subject dealing with daily friction, moody cinematic lighting, shallow depth of field, authentic emotional storytelling, filmic color grading.`,
          veoNegativePrompt: 'overexposed, cartoonish, low detail, watermark, plastic look',
          cameraMovement: 'Slow steady dolly shot',
          motion: 'Subtle natural human motion with environmental depth',
          productPreservationRules: 'No product distortion',
          brandPreservationRules: 'Maintain premium commercial grade color grading',
          textSafeComposition: 'Centered text safe zone',
          transitionIntention: 'Match cut directly to product hero presentation',
          referenceAssetIds: [],
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 3,
          durationSeconds: 5.0,
          purpose: 'PRODUCT HERO',
          narration: `Meet ${productName} — engineered specifically for ${contentJob.audience || brand.targetAudience || 'uncompromising creators'}.`,
          onScreenText: productName.toUpperCase(),
          visualType: 'PRODUCT_SHOWCASE' as SceneVisualType,
          subject: `Hero presentation of ${productName} suspended in air with 360 rotation`,
          environment: `Reflective dark obsidian stage with glowing ${brandPrimaryColor} ground mist`,
          composition: 'Macro central 9:16 portrait focus',
          camera: 'Smooth 45-degree orbit and slow rising pedestal',
          lighting: `Dual-tone luxury studio lighting (${brandPrimaryColor} key light, ${brandSecondaryColor} fill)`,
          mood: 'Prestigious, refined, innovative',
          transition: 'Smooth push zoom',
          animationIntent: 'Luminescent outline trace with smooth floating elevation',
          assetRequirement: `Prisiline first-party hero asset of ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Pristine product craftsmanship and physical authority',
          veoPrompt: `Commercial studio hero shot in 9:16. ${productName} rotating smoothly on pristine reflective obsidian surface, soft volumetric ground smoke, dual-tone studio lighting (${brandPrimaryColor} and ${brandSecondaryColor}), 8k photorealistic product commercial.`,
          veoNegativePrompt: 'blurry, fake brand, distorted label, incorrect proportions, CGI artifacts',
          cameraMovement: 'Smooth 45-degree circular orbit and slow upward crane',
          motion: 'Pristine smooth 360-degree rotation',
          productPreservationRules: `Strict preservation of ${productName} real product silhouette and labeling`,
          brandPreservationRules: `Align with brand palette: ${brandPrimaryColor}, ${brandSecondaryColor}`,
          textSafeComposition: 'Keep center 70% safe for bold brand typography',
          transitionIntention: 'Push zoom into feature mechanism',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: heroProductAsset ? heroProductAsset.id : null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 4,
          durationSeconds: 5.0,
          purpose: 'FEATURE',
          narration: `Powered by ${primaryFeature}, delivering precision and reliability without compromise.`,
          onScreenText: primaryFeature.toUpperCase(),
          visualType: 'DEMONSTRATION' as SceneVisualType,
          subject: `Detailed close-up demonstration of ${primaryFeature}`,
          environment: 'High-tech studio environment with dynamic particle illumination',
          composition: 'Macro tight shot highlighting technical excellence',
          camera: 'Slow precision linear glide across product contours',
          lighting: 'Crisp specular directional lighting accentuating texture',
          mood: 'Technical, sophisticated, credible',
          transition: 'Quick pan',
          animationIntent: 'Interactive callout line and pulsing spec indicator badge',
          assetRequirement: `Close-up detail shot of ${productName} demonstrating ${primaryFeature}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: null,
          emphasis: 'Concrete tangible evidence of product capability',
          veoPrompt: `Macro 9:16 demonstration of ${productName}. Detailed close-up showing ${primaryFeature} in active demonstration, clean crisp specular highlights, high-speed shutter aesthetic, photorealistic texture.`,
          veoNegativePrompt: 'blurry, distorted materials, fake text, low-res',
          cameraMovement: 'Linear glide across product surface',
          motion: 'Active functional demonstration motion',
          productPreservationRules: 'Accurate physical textures and mechanical features',
          brandPreservationRules: 'Consistent brand lighting palette',
          textSafeComposition: 'Left-aligned callout badge safe area',
          transitionIntention: 'Quick pan into customer transformation',
          referenceAssetIds: detailProductAsset ? [detailProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 5,
          durationSeconds: 5.0,
          purpose: 'BENEFIT',
          narration: `That means ${primaryBenefit} every single day, so you can achieve peak performance effortlessly.`,
          onScreenText: primaryBenefit.toUpperCase(),
          visualType: 'SOLUTION' as SceneVisualType,
          subject: 'Customer experiencing the breakthrough benefit and transformation',
          environment: 'Bright, uplifting, modern real-world environment',
          composition: 'Medium lifestyle shot with warm visual payoff',
          camera: 'Natural handheld tracking motion with cinematic stabilization',
          lighting: 'Golden hour warm natural illumination',
          mood: 'Triumphant, energizing, rewarding',
          transition: 'Soft zoom out',
          animationIntent: 'Dynamic benefit pill card sliding in from bottom-third',
          assetRequirement: 'Lifestyle footage showcasing positive customer outcome and emotional satisfaction',
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: null,
          emphasis: 'Emotional payoff and customer transformation',
          veoPrompt: `Uplifting cinematic 9:16 vertical lifestyle video. Confident user experiencing ${primaryBenefit}, beautiful warm golden-hour lighting, premium commercial cinematography, authentic joyful expression.`,
          veoNegativePrompt: 'dark, gloomy, distorted faces, unrealistic movement',
          cameraMovement: 'Smooth handheld follow shot',
          motion: 'Natural joyful human action',
          productPreservationRules: 'Product integrated naturally in lifestyle context',
          brandPreservationRules: 'Warm premium color tone',
          textSafeComposition: 'Bottom-third card placement',
          transitionIntention: 'Smooth zoom transition into brand moment',
          referenceAssetIds: [],
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 6,
          durationSeconds: 4.0,
          purpose: 'BRAND MOMENT',
          narration: `${brand.name}. ${(brand as any).mission || brand.description || 'Built for those who demand the best.'}`,
          onScreenText: brand.name.toUpperCase(),
          visualType: 'BRAND' as SceneVisualType,
          subject: `Brand identity showcase with ${productName} and official logo`,
          environment: `Immersive branded visual space with signature ${brandPrimaryColor} and ${brandSecondaryColor} elements`,
          composition: 'Centered wide portrait framing',
          camera: 'Slow cinematic pull-back',
          lighting: 'Epic architectural backlighting',
          mood: 'Authoritative, timeless, iconic',
          transition: 'Seamless wipe',
          animationIntent: 'Smooth logo reveal with glowing brand particle trail',
          assetRequirement: `Official logo of ${brand.name} alongside ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Brand trust, legacy, and emotional connection',
          veoPrompt: `Epic 9:16 brand anthem shot. ${brand.name} visual identity with ${productName}, architectural studio backlighting in ${brandPrimaryColor}, premium commercial grade aesthetic.`,
          veoNegativePrompt: 'misspelled logo, incorrect colors, low quality',
          cameraMovement: 'Slow dramatic pull-back',
          motion: 'Ambient light sweep across logo and product',
          productPreservationRules: 'Authentic product and logo display',
          brandPreservationRules: `Preserve exact brand identity: ${brand.name}`,
          textSafeComposition: 'Centered brand text safe zone',
          transitionIntention: 'Seamless wipe to closing call to action',
          referenceAssetIds: logoAsset ? [logoAsset.id] : [],
          firstFrameAssetId: null,
          lastFrameAssetId: logoAsset ? logoAsset.id : null
        },
        {
          sceneNumber: 7,
          durationSeconds: 3.0,
          purpose: 'CTA',
          narration: `${contentJob.cta || brand.primaryCta || 'Tap the link below to get yours today.'}`,
          onScreenText: (contentJob.cta || brand.primaryCta || 'SHOP NOW').toUpperCase(),
          visualType: 'CTA' as SceneVisualType,
          subject: `High-converting commercial endcard with ${productName} and interactive CTA button`,
          environment: 'Clean modern dark gradient with glowing accent border',
          composition: 'Centered 9:16 commercial card layout',
          camera: 'Locked static frame with pulsing animation',
          lighting: 'Studio spotlight on CTA action element',
          mood: 'Action-oriented, urgent, compelling',
          transition: 'Fade to black',
          animationIntent: 'Pulsing CTA button with subtle gradient shimmer and arrow indicator',
          assetRequirement: 'Branded call to action endcard with clear link and product visual',
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Immediate viewer conversion and clear next action',
          veoPrompt: `Commercial endcard in 9:16 vertical. Clean dark luxury gradient, ${productName} centered with glowing ${brandPrimaryColor} call-to-action button, commercial advertisement finale.`,
          veoNegativePrompt: 'cluttered, broken text, illegible font',
          cameraMovement: 'Static locked focus',
          motion: 'Pulsing CTA glow and subtle particle drift',
          productPreservationRules: 'Clean product hero presentation',
          brandPreservationRules: 'Exact brand primary CTA styling',
          textSafeComposition: 'Strict center card safe margins',
          transitionIntention: 'Fade to black',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: null,
          lastFrameAssetId: logoAsset ? logoAsset.id : null
        }
      ];

      scriptSegments = [
        { id: 'seg-1', purpose: 'Hook', text: hookText, estimatedDuration: 4.0, deliveryStyle: 'Punchy & Magnetic', emotionalTone: 'High Energy' },
        { id: 'seg-2', purpose: 'Problem', text: scenes[1].narration, estimatedDuration: 4.0, deliveryStyle: 'Relatable & Empathetic', emotionalTone: 'Serious' },
        { id: 'seg-3', purpose: 'Product Hero', text: scenes[2].narration, estimatedDuration: 5.0, deliveryStyle: 'Prestigious & Confident', emotionalTone: 'Aspirational' },
        { id: 'seg-4', purpose: 'Feature', text: scenes[3].narration, estimatedDuration: 5.0, deliveryStyle: 'Precise & Authoritative', emotionalTone: 'Informative' },
        { id: 'seg-5', purpose: 'Benefit', text: scenes[4].narration, estimatedDuration: 5.0, deliveryStyle: 'Uplifting & Inspiring', emotionalTone: 'Rewarding' },
        { id: 'seg-6', purpose: 'Brand Moment', text: scenes[5].narration, estimatedDuration: 4.0, deliveryStyle: 'Iconic & Resonant', emotionalTone: 'Authoritative' },
        { id: 'seg-7', purpose: 'CTA', text: scenes[6].narration, estimatedDuration: 3.0, deliveryStyle: 'Direct & Action-Oriented', emotionalTone: 'Urgent' }
      ];
    } else if (targetDurationSeconds >= 18) {
      // 20-Second Commercial (4 Scenes: 4s HOOK, 5s PRODUCT HERO, 6s BENEFIT/BRAND, 5s CTA)
      scenes = [
        {
          sceneNumber: 1,
          durationSeconds: 4.0,
          purpose: 'HOOK',
          narration: hookText,
          onScreenText: hookText.toUpperCase(),
          visualType: 'PRODUCT_SHOWCASE',
          subject: `High-energy reveal of ${productName}`,
          environment: `Modern branded studio with ${brandPrimaryColor} accent lights`,
          composition: '9:16 vertical centered dynamic shot',
          camera: 'Fast push-in with dynamic angle',
          lighting: 'Vibrant studio rim lighting',
          mood: 'High-energy and captivating',
          transition: 'Whip cut',
          animationIntent: 'Kinetic pop text burst',
          assetRequirement: `Hero asset of ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Immediate visual grab',
          veoPrompt: `Dynamic 9:16 vertical commercial hook. Fast push-in on ${productName}, sharp macro detail, vibrant ${brandPrimaryColor} lighting.`,
          veoNegativePrompt: 'blurry, low quality, distorted text',
          cameraMovement: 'Fast push-in',
          motion: 'Dynamic kinetic burst',
          productPreservationRules: `Preserve ${productName} real features`,
          brandPreservationRules: `Brand colors: ${brandPrimaryColor}`,
          textSafeComposition: 'Center safe area',
          transitionIntention: 'Whip cut to product hero',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: heroProductAsset ? heroProductAsset.id : null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 2,
          durationSeconds: 5.0,
          purpose: 'PRODUCT HERO',
          narration: `Engineered with ${primaryFeature}, ${productName} sets a new standard for ${brand.industry}.`,
          onScreenText: primaryFeature.toUpperCase(),
          visualType: 'DEMONSTRATION',
          subject: `Cinematic showcase of ${productName} and ${primaryFeature}`,
          environment: 'Luxury reflective stage with ground haze',
          composition: 'Macro central portrait',
          camera: 'Smooth 45-degree orbit',
          lighting: 'Dual-tone luxury studio glow',
          mood: 'Prestigious and cutting-edge',
          transition: 'Push zoom',
          animationIntent: 'Feature badge with glowing edge',
          assetRequirement: `Detailed product showcase of ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Core technological advantage',
          veoPrompt: `Commercial studio macro shot in 9:16. ${productName} showcasing ${primaryFeature}, reflective surface, volumetric lighting, photorealistic.`,
          veoNegativePrompt: 'fake label, CGI artifacts',
          cameraMovement: 'Smooth orbit',
          motion: 'Smooth rotational showcase',
          productPreservationRules: 'Exact product silhouette',
          brandPreservationRules: 'Brand color palette',
          textSafeComposition: 'Top third overlay safe',
          transitionIntention: 'Push zoom to benefit',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 3,
          durationSeconds: 6.0,
          purpose: 'BENEFIT',
          narration: `Experience ${primaryBenefit} and transform the way you create. ${brand.name} delivers results.`,
          onScreenText: primaryBenefit.toUpperCase(),
          visualType: 'SOLUTION',
          subject: 'Satisfied customer enjoying the tangible benefit',
          environment: 'Bright modern lifestyle setting',
          composition: 'Medium lifestyle framing',
          camera: 'Slow tracking dolly',
          lighting: 'Warm natural daylight',
          mood: 'Uplifting and transformative',
          transition: 'Smooth wipe',
          animationIntent: 'Sliding benefit badge with logo watermark',
          assetRequirement: 'Lifestyle footage showing customer satisfaction and real results',
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Customer payoff and transformation',
          veoPrompt: `Cinematic 9:16 lifestyle scene. Happy customer enjoying ${primaryBenefit} with ${productName}, beautiful natural lighting, premium feel.`,
          veoNegativePrompt: 'gloomy, distorted',
          cameraMovement: 'Slow dolly',
          motion: 'Natural authentic action',
          productPreservationRules: 'Authentic product presence',
          brandPreservationRules: 'Consistent aesthetic',
          textSafeComposition: 'Bottom-third safe area',
          transitionIntention: 'Smooth wipe to CTA',
          referenceAssetIds: [],
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 4,
          durationSeconds: 5.0,
          purpose: 'CTA',
          narration: `${contentJob.cta || brand.primaryCta || 'Tap the link in bio to get yours today.'}`,
          onScreenText: (contentJob.cta || brand.primaryCta || 'GET YOURS NOW').toUpperCase(),
          visualType: 'CTA',
          subject: `Commercial endcard featuring ${productName} and primary CTA`,
          environment: 'Clean dark branded gradient',
          composition: 'Centered card layout',
          camera: 'Static locked focus',
          lighting: 'Spotlight on CTA button',
          mood: 'Urgent, action-oriented',
          transition: 'Fade to black',
          animationIntent: 'Pulsing CTA button with gradient border shimmer',
          assetRequirement: 'Branded call to action card with link indicator',
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Immediate viewer action',
          veoPrompt: `Commercial endcard in 9:16. ${productName} centered with glowing ${brandPrimaryColor} CTA button, clean luxury aesthetic.`,
          veoNegativePrompt: 'cluttered, broken text',
          cameraMovement: 'Static focus',
          motion: 'Pulsing button animation',
          productPreservationRules: 'Pristine product endcard',
          brandPreservationRules: 'Primary CTA styling',
          textSafeComposition: 'Center card safe margin',
          transitionIntention: 'Fade to black',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: null,
          lastFrameAssetId: logoAsset ? logoAsset.id : null
        }
      ];

      scriptSegments = [
        { id: 'seg-1', purpose: 'Hook', text: hookText, estimatedDuration: 4.0, deliveryStyle: 'Punchy', emotionalTone: 'High Energy' },
        { id: 'seg-2', purpose: 'Product Hero', text: scenes[1].narration, estimatedDuration: 5.0, deliveryStyle: 'Authoritative', emotionalTone: 'Confident' },
        { id: 'seg-3', purpose: 'Benefit', text: scenes[2].narration, estimatedDuration: 6.0, deliveryStyle: 'Inspiring', emotionalTone: 'Rewarding' },
        { id: 'seg-4', purpose: 'CTA', text: scenes[3].narration, estimatedDuration: 5.0, deliveryStyle: 'Direct', emotionalTone: 'Urgent' }
      ];
    } else {
      // 15-Second Commercial (4 Scenes: 3s HOOK, 4s PRODUCT HERO, 4s BENEFIT, 4s CTA)
      scenes = [
        {
          sceneNumber: 1,
          durationSeconds: 3.0,
          purpose: 'HOOK',
          narration: hookText,
          onScreenText: hookText.toUpperCase(),
          visualType: 'PRODUCT_SHOWCASE',
          subject: `Instant visual hook with ${productName}`,
          environment: `High-energy branded environment (${brandPrimaryColor})`,
          composition: '9:16 vertical close-up',
          camera: 'Fast push-in',
          lighting: 'Bright dynamic rim lighting',
          mood: 'Electric, fast-paced',
          transition: 'Whip cut',
          animationIntent: 'Bold kinetic pop text',
          assetRequirement: `Hero asset of ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Instant viewer retention',
          veoPrompt: `Fast 9:16 vertical hook. Dynamic reveal of ${productName}, volumetric rim lighting, crisp 4K detail.`,
          veoNegativePrompt: 'blurry, low quality',
          cameraMovement: 'Fast push-in',
          motion: 'Fast kinetic energy',
          productPreservationRules: `Accurate ${productName}`,
          brandPreservationRules: `Colors: ${brandPrimaryColor}`,
          textSafeComposition: 'Center safe area',
          transitionIntention: 'Whip cut to hero',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: heroProductAsset ? heroProductAsset.id : null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 2,
          durationSeconds: 4.0,
          purpose: 'PRODUCT HERO',
          narration: `Meet ${productName} — featuring ${primaryFeature} for peak performance.`,
          onScreenText: primaryFeature.toUpperCase(),
          visualType: 'DEMONSTRATION',
          subject: `Pristine product presentation of ${productName}`,
          environment: 'Reflective studio stage with ground mist',
          composition: 'Macro central portrait',
          camera: 'Smooth 45-degree orbit',
          lighting: 'Dual-tone luxury lighting',
          mood: 'Prestigious',
          transition: 'Push zoom',
          animationIntent: 'Glowing feature highlight badge',
          assetRequirement: `Detail showcase of ${productName}`,
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Product craftsmanship',
          veoPrompt: `Commercial studio macro shot in 9:16. ${productName} rotating smoothly, reflective floor, volumetric lights.`,
          veoNegativePrompt: 'distorted label, CGI glitch',
          cameraMovement: 'Smooth orbit',
          motion: 'Rotational showcase',
          productPreservationRules: 'Strict product silhouette',
          brandPreservationRules: 'Brand color harmony',
          textSafeComposition: 'Top-third safe zone',
          transitionIntention: 'Push zoom to benefit',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 3,
          durationSeconds: 4.0,
          purpose: 'BENEFIT',
          narration: `Get ${primaryBenefit} faster than ever before.`,
          onScreenText: primaryBenefit.toUpperCase(),
          visualType: 'SOLUTION',
          subject: 'Customer transformation outcome',
          environment: 'Bright modern lifestyle space',
          composition: 'Medium lifestyle portrait',
          camera: 'Slow tracking dolly',
          lighting: 'Warm daylight',
          mood: 'Inspiring, positive',
          transition: 'Smooth wipe',
          animationIntent: 'Sliding benefit badge',
          assetRequirement: 'Lifestyle footage demonstrating customer benefit',
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: null,
          emphasis: 'Transformation payoff',
          veoPrompt: `Uplifting 9:16 lifestyle commercial scene. Customer enjoying ${primaryBenefit}, warm sunlight, joyful expression.`,
          veoNegativePrompt: 'dark, distorted',
          cameraMovement: 'Slow tracking',
          motion: 'Natural lifestyle movement',
          productPreservationRules: 'Authentic appearance',
          brandPreservationRules: 'Warm color grading',
          textSafeComposition: 'Bottom-third safe area',
          transitionIntention: 'Smooth wipe to CTA',
          referenceAssetIds: [],
          firstFrameAssetId: null,
          lastFrameAssetId: null
        },
        {
          sceneNumber: 4,
          durationSeconds: 4.0,
          purpose: 'CTA',
          narration: `${contentJob.cta || brand.primaryCta || 'Tap the link to get started now.'}`,
          onScreenText: (contentJob.cta || brand.primaryCta || 'SHOP NOW').toUpperCase(),
          visualType: 'CTA',
          subject: `Endcard with ${productName} and CTA`,
          environment: 'Clean dark branded background',
          composition: 'Centered card layout',
          camera: 'Static locked focus',
          lighting: 'Spotlight on button',
          mood: 'Urgent',
          transition: 'Fade to black',
          animationIntent: 'Pulsing CTA button with gradient border shimmer',
          assetRequirement: 'Branded call to action card with link indicator',
          productReference: targetProduct ? targetProduct.id : brand.name,
          brandElement: brand.name,
          emphasis: 'Immediate action',
          veoPrompt: `Commercial endcard in 9:16. ${productName} with glowing ${brandPrimaryColor} CTA button.`,
          veoNegativePrompt: 'broken text, low-res',
          cameraMovement: 'Static focus',
          motion: 'Pulsing button animation',
          productPreservationRules: 'Clean product endcard',
          brandPreservationRules: 'Primary CTA styling',
          textSafeComposition: 'Center card safe margin',
          transitionIntention: 'Fade to black',
          referenceAssetIds: heroProductAsset ? [heroProductAsset.id] : attachedProductAssetIds,
          firstFrameAssetId: null,
          lastFrameAssetId: logoAsset ? logoAsset.id : null
        }
      ];

      scriptSegments = [
        { id: 'seg-1', purpose: 'Hook', text: hookText, estimatedDuration: 3.0, deliveryStyle: 'Punchy', emotionalTone: 'High Energy' },
        { id: 'seg-2', purpose: 'Product Hero', text: scenes[1].narration, estimatedDuration: 4.0, deliveryStyle: 'Confident', emotionalTone: 'Aspirational' },
        { id: 'seg-3', purpose: 'Benefit', text: scenes[2].narration, estimatedDuration: 4.0, deliveryStyle: 'Inspiring', emotionalTone: 'Positive' },
        { id: 'seg-4', purpose: 'CTA', text: scenes[3].narration, estimatedDuration: 4.0, deliveryStyle: 'Direct', emotionalTone: 'Urgent' }
      ];
    }

    // Ensure durations sum precisely to targetDurationSeconds
    const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
    const drift = targetDurationSeconds - totalDuration;
    if (Math.abs(drift) > 0.001) {
      scenes[scenes.length - 1].durationSeconds = Number(
        (scenes[scenes.length - 1].durationSeconds + drift).toFixed(2)
      );
      scriptSegments[scriptSegments.length - 1].estimatedDuration = scenes[scenes.length - 1].durationSeconds;
    }

    const allAvailableAssets = [...(brandAssets || []), ...(productAssets || [])];

    // Connect Product Asset Binding to Veo 3.1 Reference Images for each scene
    for (const scene of scenes) {
      const isProductCentric = VeoReferenceAssetResolver.isProductScene(scene);
      const resolvedRefs = VeoReferenceAssetResolver.resolveReferences({
        brand,
        product: targetProduct,
        products,
        scene,
        brandAssets: allAvailableAssets,
        workspaceId: brand.workspaceId,
        isProduction: true
      });

      scene.veoModel = 'veo-3.1-generate-preview';

      if (isProductCentric) {
        scene.referenceAssetIds = resolvedRefs.referenceAssetIds;
        scene.firstFrameAssetId = resolvedRefs.firstFrameAssetId;
        scene.veoPrompt = scene.veoPrompt
          ? `${scene.veoPrompt} ${resolvedRefs.preservationPromptDirective}`.trim()
          : resolvedRefs.preservationPromptDirective;
        scene.veoNegativePrompt = scene.veoNegativePrompt
          ? `${scene.veoNegativePrompt}, ${resolvedRefs.negativePromptDirective}`.trim()
          : resolvedRefs.negativePromptDirective;

        if (resolvedRefs.isValid) {
          scene.veoGenerationStatus = 'SUBMITTED';
        } else {
          scene.veoGenerationStatus = 'FAILED';
          scene.failureReason = resolvedRefs.failureReason || 'PRODUCT_REFERENCE_REQUIRED';
        }
      } else {
        scene.veoGenerationStatus = scene.veoGenerationStatus || 'SUBMITTED';
      }
    }

    const concept = {
      title: contentJob.title || `${productName} Commercial Showcase`,
      concept: `High-converting commercial advertisement showcasing ${productName} through problem agitation, macro product hero presentation, concrete feature proof, and urgent call-to-action.`,
      objective: contentJob.objective || campaign?.objective || 'Drive brand awareness and product acquisition',
      targetAudience: contentJob.audience || (typeof campaign?.targetAudience === 'string' ? campaign.targetAudience : 'Target customers seeking high quality'),
      corePromise: primaryBenefit,
      emotionalAngle: 'From frustration to empowerment and delight',
      messagingAngle: contentJob.messagingAngle || 'Authoritative product demonstration',
      contentPillar: contentJob.contentPillar || 'Product Showcase',
      funnelStage: (contentJob.funnelStage || 'CONSIDERATION') as 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION'
    };

    const visualDirection = {
      style: 'Cinematic commercial advertising with high production value',
      mood: 'Prestigious, energizing, modern',
      colorIntent: `Signature brand palette centered on ${brandPrimaryColor} with ${brandSecondaryColor} accents`,
      lightingIntent: 'Crisp volumetric studio rim lighting with dramatic contrast',
      composition: 'Strict 9:16 vertical portrait framing optimized for mobile screens',
      cameraLanguage: 'Dynamic rhythmic motion with seamless match cuts and orbits',
      pacing: 'Fast-paced with deliberate pauses on macro product hero moments',
      visualHierarchy: 'Product hero first, followed by kinetic bold typography',
      brandIntegration: `${brand.name} watermark, color palette, and official logo endcard`,
      productEmphasis: `Continuous hero visibility of genuine ${productName} first-party assets`
    };

    const voiceDirection = {
      style: brandVoice,
      pace: 'Energetic commercial pace (150-165 WPM)',
      tone: 'Confident, authoritative, inspiring',
      genderPreference: 'ANY',
      language: 'en-US'
    };

    const captionDirection = {
      style: 'High-contrast kinetic caption track with word-by-word active glow',
      placement: 'Bottom-third center safe zone',
      density: '2-4 words per burst',
      fontEmphasis: 'Heavy bold brand sans-serif with subtle dark drop shadow',
      animation: 'Scale-pop in synchronization with voiceover syllables'
    };

    const animationDirection = {
      energy: 'High',
      style: 'Smooth kinetic commercial motion graphics',
      textAnimation: 'Word-by-word active highlight with spring physics',
      visualTransitions: 'Whip pans, push zooms, and seamless match cuts',
      elementMotion: 'Subtle ambient particle drift and glowing outline traces'
    };

    const audioDirection = {
      musicMood: 'Tech-forward electronic lo-fi with energetic bassline and uplifting drop',
      soundEffects: 'Subtle whooshes on cuts and crisp clicks on text reveals',
      pacing: '124 BPM matching transition points',
      mixBalance: 'Voice 100%, Music 22%, SFX 35%'
    };

    const cta = {
      type: 'LEARN_MORE' as const,
      text: contentJob.cta || brand.primaryCta || `Try ${productName} Today`,
      visualTreatment: 'Gradient pill card with glowing border and arrow indicator',
      placement: `Scene ${scenes.length} final 3 seconds`,
      url: targetProduct?.cta || null
    };

    const hook = {
      type: hookType,
      text: hookText,
      visualIntent: `Immediate reveal of ${productName} with high-energy kinetic text`,
      deliveryStyle: 'Punchy, conversational, magnetic',
      durationSeconds: scenes[0].durationSeconds
    };

    return {
      title: contentJob.title || `${productName} Commercial Showcase`,
      concept,
      objective: concept.objective,
      audience: concept.targetAudience,
      funnelStage: concept.funnelStage,
      contentPillar: concept.contentPillar,
      durationSeconds: targetDurationSeconds,
      aspectRatio,
      platform,
      format,
      hook,
      narrative: concept.concept,
      script: scriptSegments,
      scenes,
      visualDirection,
      voiceDirection,
      captionDirection,
      animationDirection,
      audioDirection,
      cta
    };
  }
}
