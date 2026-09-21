import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import type { Database } from '@vidsnapai/database';
import {
  type ReelProductionPlan,
  type AnimationRenderContract,
  type VideoRenderOutput,
  type VideoRenderer,
  type RenderTimelineSpec,
  type RenderJobStatus,
  type StorageProvider,
  type ReelProductionPackage
} from '@vidsnapai/types';
import { LocalStorageProvider } from '@vidsnapai/storage';
import { ReelProductionPlanRepository } from './repositories/reel-production-plan.repository.js';
import { ProductionPackageService } from './productionPackageService.js';
import { AnimationService } from '@vidsnapai/animation';
import { DnaRepository } from '@vidsnapai/brand';
import { ReelAssetRepository, ProductionAssetValidator } from '@vidsnapai/media';
import { RenderContractAdapter, type CompositionSpec, type AdaptedSceneSpec } from './renderContractAdapter.js';
import { MediaAssetDownloader } from './mediaAssetDownloader.js';
import { VisualFrameValidator, type FrameValidationResult } from './visualFrameValidator.js';
import { ReelQAChecker } from './reelQAChecker.js';
import type { SceneVideoArtifact } from '@vidsnapai/types';

export interface VideoRenderOptions {
  renderMode?: 'PRODUCTION' | 'PREVIEW';
  width?: number;
  height?: number;
  fps?: number;
  storageProvider?: StorageProvider;
  customOutputFilename?: string;
  debug?: boolean;
  debugOutputDir?: string;
  onProgress?: (percent: number, message: string) => void;
}

export class VideoRenderService implements VideoRenderer {
  public readonly rendererName = 'ffmpeg-reel-renderer';

  private reelRepo: ReelProductionPlanRepository;
  private packageService: ProductionPackageService;
  private animationService: AnimationService;
  private dnaRepo: DnaRepository;
  private reelAssetRepo: ReelAssetRepository;
  private storageProvider: StorageProvider;

  constructor(
    private db: Database,
    options?: {
      storageProvider?: StorageProvider;
      reelRepo?: ReelProductionPlanRepository;
      packageService?: ProductionPackageService;
      animationService?: AnimationService;
      dnaRepo?: DnaRepository;
      reelAssetRepo?: ReelAssetRepository;
    }
  ) {
    this.reelRepo = options?.reelRepo || new ReelProductionPlanRepository(db);
    this.packageService = options?.packageService || new ProductionPackageService(db);
    this.animationService = options?.animationService || new AnimationService();
    this.dnaRepo = options?.dnaRepo || new DnaRepository(db);
    this.reelAssetRepo = options?.reelAssetRepo || new ReelAssetRepository(db);
    this.storageProvider = options?.storageProvider || new LocalStorageProvider();
  }

  /**
   * Primary pipeline entry point:
   * Renders the complete vertical video for a given Reel Production Plan.
   */
  async renderReelVideo(
    reelPlanId: string,
    workspaceId: string,
    options?: VideoRenderOptions
  ): Promise<VideoRenderOutput> {
    const reelPlan = await this.reelRepo.findByIdAndWorkspace(reelPlanId, workspaceId);
    if (!reelPlan) {
      throw new Error(`Reel production plan with ID "${reelPlanId}" not found in workspace "${workspaceId}".`);
    }

    const jobId = `render_${reelPlan.id}_${Date.now()}`;
    const startTime = new Date();

    // 1. Update Reel status to RENDERING
    await this.reelRepo.updateStatus(reelPlan.id, 'RENDERING');
    options?.onProgress?.(5, 'Preparing render workspace and package assets');

    try {
      // 2. Fetch or compile production package
      let productionPackage = await this.packageService.getPackageByReelPlanId(reelPlan.id, workspaceId);
      if (!productionPackage) {
        productionPackage = await this.packageService.compilePackage(reelPlan.id, workspaceId);
      }
      options?.onProgress?.(15, 'Production package verified');

      // Pre-render product asset requirement and eligibility check
      const isProduction = options?.renderMode !== 'PREVIEW';
      const packageAssets = (productionPackage?.packagePayload?.assets || (productionPackage as any)?.packageData?.assets || []) as any[];

      if (isProduction) {
        for (const asset of packageAssets) {
          const validation = ProductionAssetValidator.validateAssetEligibility(asset, {
            workspaceId,
            brandId: reelPlan.brandId,
            isProduction: true
          });
          if (!validation.valid) {
            throw new Error(`${validation.errorCode || 'PRODUCT_ASSET_INVALID'}: Package asset "${asset.name || asset.id}" is ineligible: ${validation.errorMessage}`);
          }
        }

        const eligibleProductAssets = packageAssets.filter(
          (a) =>
            (a.assetType === 'PRODUCT_IMAGE' ||
              a.assetType === 'PRODUCT_VIDEO' ||
              a.assetType === 'IMAGE' ||
              a.assetType === 'VIDEO' ||
              a.type === 'IMAGE' ||
              a.type === 'VIDEO' ||
              a.role === 'PRODUCT' ||
              a.role === 'HERO') &&
            (a.status === 'READY' || a.status === undefined || a.localPath || a.storageUrl || a.url) &&
            !a.isPlaceholder &&
            !a.isTestAsset &&
            a.productionEligible !== false
        );

        const hasSceneMedia = reelPlan.scenes?.some((s) => (s as any).mediaUrl && !(s as any).mediaUrl.includes('test') && !(s as any).mediaUrl.includes('placeholder'));

        // If package assets do not contain an eligible product media asset, halt
        if (eligibleProductAssets.length === 0 && !hasSceneMedia) {
          throw new Error('PRODUCT_MEDIA_REQUIRED: PRODUCT_ASSET_REQUIRED: Upload at least one production-ready product image or video before generating this reel.');
        }
      }

      // 3. Fetch or generate animation plan
      let animationPlan = await this.animationService.getLatestPlan(reelPlan.id, workspaceId);
      const brandDna = await this.dnaRepo.findLatestByBrandId(reelPlan.brandId).catch(() => null);

      if (!animationPlan) {
        const animResult = await this.animationService.generateAnimationPlan({
          workspaceId,
          brandId: reelPlan.brandId,
          reelPlan,
          productionPackage,
          brandDna
        });
        animationPlan = animResult.animationPlan;
      }

      if (!animationPlan) {
        throw new Error(`Failed to initialize animation plan for reel "${reelPlan.id}".`);
      }
      options?.onProgress?.(25, 'Animation plan resolved');

      // 4. Build and Validate AnimationRenderContract
      const contract: AnimationRenderContract = this.animationService.buildRenderContract({
        animationPlan,
        productionPackage,
        brandDna
      });

      const validation = RenderContractAdapter.validate(contract);
      if (!validation.valid) {
        throw new Error(`Render Preflight Validation Failed: ${validation.errors.join('; ')}`);
      }

      const spec = RenderContractAdapter.adapt(contract);
      options?.onProgress?.(35, 'Composing multi-track scene filter graphs');

      // 5. Compose and encode the vertical video via FFmpeg
      await this.reelRepo.updateStatus(reelPlan.id, 'QUALITY_CHECK');
      const { tempVideoPath, durationSeconds, width, height, fps, validationResult } =
        await this.composeVideoWithFfmpeg(spec, reelPlan, options, productionPackage);

      options?.onProgress?.(80, 'FFmpeg encoding complete. Uploading to storage');

      // 6. Upload rendered MP4 to Storage Provider
      const videoBuffer = await fs.promises.readFile(tempVideoPath);
      const storageKey = `${workspaceId}/reels/${reelPlan.id}_${Date.now()}.mp4`;
      const filename =
        options?.customOutputFilename ||
        `${reelPlan.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)}.mp4`;

      const uploadResult = await this.storageProvider.uploadBuffer(
        videoBuffer,
        storageKey,
        'video/mp4',
        filename
      );

      // Clean up temporary local render working files (if not preserved for debug)
      if (!options?.debug && process.env.DEBUG_RENDER !== 'true') {
        try {
          if (fs.existsSync(tempVideoPath)) {
            await fs.promises.unlink(tempVideoPath);
          }
          const tempDir = path.dirname(tempVideoPath);
          if (tempDir.includes('vidsnapai_render_')) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
          }
        } catch {
          // Non-blocking cleanup
        }
      }

      const completedAt = new Date().toISOString();
      const renderOutput: VideoRenderOutput = {
        jobId,
        status: 'COMPLETED',
        outputVideoUrl: uploadResult.url,
        storageKey: uploadResult.key,
        durationSeconds: Math.round(durationSeconds),
        fileSizeBytes: uploadResult.sizeBytes,
        resolution: { width, height },
        aspectRatio: contract.dimensions?.aspectRatio || reelPlan.aspectRatio || '9:16',
        fps,
        renderedAt: startTime.toISOString(),
        completedAt,
        diagnostics: {
          renderId: jobId,
          inputDimensions: { width, height },
          outputDimensions: { width, height },
          duration: durationSeconds,
          visualVariance: validationResult?.averageStdDev,
          uniqueColors: validationResult?.averageUniqueColors,
          validatedSampleCount: validationResult?.samplePointsCount
        }
      };

      // 7. Persist render output in reel_production_plans (status -> COMPLETED)
      await this.reelRepo.saveRenderOutput(reelPlan.id, renderOutput, 'COMPLETED');

      // 8. Persist asset record in reel_assets for media traceability
      try {
        await this.reelAssetRepo.create({
          reelPlanId: reelPlan.id,
          workspaceId,
          brandId: reelPlan.brandId,
          sceneNumber: 0,
          assetType: 'VIDEO',
          sourceType: 'GENERATED',
          provider: 'local_renderer',
          sourceUrl: uploadResult.url,
          previewUrl: uploadResult.url,
          storageKey: uploadResult.key,
          filename,
          mimeType: 'video/mp4',
          width,
          height,
          durationSeconds,
          status: 'READY',
          metadata: {
            contractVersion: contract.contractVersion,
            scenesCount: contract.scenes.length,
            averageVariance: validationResult?.averageStdDev
          },
          licenseMetadata: {}
        });
      } catch (err: unknown) {
        console.warn('[VideoRenderService] Warning: Could not register rendered asset row:', err);
      }

      options?.onProgress?.(100, 'Render completed successfully');
      return renderOutput;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown render error';
      console.error(`[VideoRenderService] Failed to render reel ${reelPlan.id}:`, errorMsg);

      const failedOutput: VideoRenderOutput = {
        jobId,
        status: 'FAILED',
        outputVideoUrl: '',
        durationSeconds: reelPlan.durationSeconds || 30,
        renderedAt: startTime.toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: errorMsg,
        diagnostics: {
          renderId: jobId,
          failureReason: errorMsg
        }
      };

      await this.reelRepo.saveRenderOutput(reelPlan.id, failedOutput, 'FAILED');
      throw error;
    }
  }

  /**
   * Multi-scene composition engine using FFmpeg.
   * Generates a 1080x1920 (9:16 vertical) video conforming to the CompositionSpec,
   * with real scene media, camera motion, text animations, brand logo, audio ducking,
   * and automated visual frame quality validation.
   */
  private async composeVideoWithFfmpeg(
    spec: CompositionSpec,
    reelPlan: ReelProductionPlan,
    options?: VideoRenderOptions,
    productionPackage?: ReelProductionPackage | null
  ): Promise<{
    tempVideoPath: string;
    durationSeconds: number;
    width: number;
    height: number;
    fps: number;
    validationResult: FrameValidationResult;
  }> {
    const width = options?.width || spec.width || 1080;
    const height = options?.height || spec.height || 1920;
    const fps = options?.fps || spec.fps || 30;
    const totalDuration = spec.totalDurationSeconds || reelPlan.durationSeconds || 30;

    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_render_'));
    const outputPath = path.join(tempDir, `rendered_${reelPlan.id}.mp4`);

    const isDebug = options?.debug !== false;
    const debugDir = options?.debugOutputDir || path.resolve(process.cwd(), 'debug', 'reel', reelPlan.id);

    if (isDebug) {
      if (!fs.existsSync(debugDir)) {
        await fs.promises.mkdir(debugDir, { recursive: true });
      }
      // Persist blueprint.json for debugging
      await fs.promises.writeFile(
        path.join(debugDir, 'blueprint.json'),
        JSON.stringify({ reelPlan, spec }, null, 2),
        'utf8'
      );
      if (productionPackage) {
        await fs.promises.writeFile(
          path.join(debugDir, 'production-package.json'),
          JSON.stringify(productionPackage, null, 2),
          'utf8'
        );
      }
    }

    const brandPrimary = spec.brand.primaryColor || '#1E293B';
    const brandAccent = spec.brand.accentColor || '#FF4500';

    // Step A: Download Brand Logo if available
    let localLogoPath: string | null = null;
    if (spec.brand.logoUrl) {
      const logoRes = await MediaAssetDownloader.resolveAndDownload(
        spec.brand.logoUrl,
        tempDir,
        'brand_logo'
      );
      if (logoRes.success && logoRes.localPath && fs.existsSync(logoRes.localPath)) {
        localLogoPath = logoRes.localPath;
      }
    }

    // Step B: Render each scene individually to an intermediate MP4 clip
    const scenes = spec.scenes && spec.scenes.length > 0 ? spec.scenes : [this.createFallbackSceneSpec(totalDuration)];
    const intermediateSceneFiles: string[] = [];
    const sceneArtifacts: SceneVideoArtifact[] = [];
    const packageAssets: any[] =
      productionPackage?.packagePayload?.assets ||
      (productionPackage as any)?.packageData?.assets ||
      (productionPackage as any)?.assets ||
      [];
    const captionTrack =
      (productionPackage?.packagePayload?.captionTrack ||
        (productionPackage as any)?.packageData?.captionTrack ||
        (productionPackage as any)?.captionTrack) as any;
    const allCues: any[] = captionTrack?.cues || [];
    const sceneDiagnostics: any[] = [];

    let accumulatedTime = 0;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNum = scene.sceneNumber || i + 1;
      const sceneDuration = Math.max(1, scene.duration || (scene.endTime - scene.startTime) || 5);
      const scenePlan = reelPlan.scenes?.[i];
      const sceneStartTime = accumulatedTime;
      const sceneEndTime = sceneStartTime + sceneDuration;
      accumulatedTime += sceneDuration;

      options?.onProgress?.(
        Math.min(70, 35 + Math.round((i / scenes.length) * 30)),
        `Rendering scene ${sceneNum}/${scenes.length}`
      );

      // 1. Resolve Scene Visual Media Asset
      let mediaSourceUrl: string | undefined = scene.mediaUrl;

      if (!mediaSourceUrl) {
        // Look in package assets for matching scene asset or product media
        const matchedAsset =
          packageAssets.find((a) => a.sceneNumber === sceneNum && (a.status === 'READY' || !a.status)) ||
          packageAssets.find((a) => (a.assetType === 'PRODUCT_IMAGE' || a.assetType === 'PRODUCT_VIDEO' || a.role === 'PRODUCT' || a.type === 'IMAGE' || a.type === 'VIDEO') && (a.status === 'READY' || !a.status)) ||
          packageAssets.find((a) => (a.assetType === 'IMAGE' || a.assetType === 'VIDEO') && (a.status === 'READY' || !a.status));

        if (matchedAsset) {
          mediaSourceUrl = matchedAsset.sourceUrl || matchedAsset.previewUrl || matchedAsset.storageUrl || matchedAsset.localPath || matchedAsset.url || undefined;
        }
      }

      let localMediaFile: string | null = null;
      let isVideoMedia = false;

      if (mediaSourceUrl) {
        const downloadRes = await MediaAssetDownloader.resolveAndDownload(
          mediaSourceUrl,
          tempDir,
          `scene_${sceneNum}_media`
        );
        if (!downloadRes.success) {
          if (options?.renderMode !== 'PREVIEW') {
            throw new Error(`MEDIA_ASSET_DOWNLOAD_FAILED: Scene #${sceneNum} media download failed from "${mediaSourceUrl}": ${downloadRes.error}`);
          }
        } else if (downloadRes.localPath && fs.existsSync(downloadRes.localPath)) {
          localMediaFile = downloadRes.localPath;
          const ext = path.extname(localMediaFile).toLowerCase();
          isVideoMedia = ['.mp4', '.mov', '.webm', '.mkv', '.avi'].includes(ext);

          // Deep validation of the resolved local file
          const fileValidation = await ProductionAssetValidator.validateLocalMediaFile(localMediaFile, {
            isProduction: options?.renderMode !== 'PREVIEW',
            expectedType: isVideoMedia ? 'VIDEO' : 'IMAGE'
          });

          if (!fileValidation.valid && options?.renderMode !== 'PREVIEW') {
            throw new Error(`${fileValidation.errorCode || 'PRODUCT_ASSET_INVALID'}: Scene #${sceneNum} media asset failed validation: ${fileValidation.errorMessage}`);
          }
        }
      }

      // Pre-render validation for product media: ensure input file is non-empty
      if (localMediaFile) {
        const stats = await fs.promises.stat(localMediaFile);
        if (stats.size === 0) {
          throw new Error(`MEDIA_ASSET_DOWNLOAD_FAILED: Scene #${sceneNum} media asset is empty (0 bytes) at ${localMediaFile}`);
        }
      }

      // 2. Scene Intermediate Output File
      const sceneOutputPath = path.join(tempDir, `scene-${sceneNum}-render.mp4`);

      // 3. Extract Timed Captions & Text Overlays for Scene
      const sceneCues = allCues
        .filter((c) => c.sceneNumber === sceneNum || (c.startTime >= sceneStartTime && c.startTime < sceneEndTime))
        .map((c) => ({
          text: c.text,
          startTime: Math.max(0, c.startTime - sceneStartTime),
          endTime: Math.min(sceneDuration, c.endTime - sceneStartTime)
        }))
        .filter((c) => c.endTime > c.startTime);

      const animText = scene.textAnimations?.[0]
        ? ((scene.textAnimations[0] as any).text || scene.textAnimations[0].targetText)
        : '';
      const sceneText =
        animText ||
        scenePlan?.onScreenText ||
        (i === 0 ? reelPlan.hook?.text : scenePlan?.narration) ||
        (i === scenes.length - 1 ? (reelPlan.cta?.text || 'Discover More') : '');

      const isCtaScene = i === scenes.length - 1 || scenePlan?.visualType === 'CTA';
      const ctaButtonText = isCtaScene ? (reelPlan.cta?.text || 'SHOP NOW') : undefined;

      const animIntent =
        scenePlan?.animationIntent ||
        (scene.productAnimations?.[0] as any)?.preset ||
        (scene as any).animationIntent ||
        (i === 0 ? 'HERO_REVEAL' : isCtaScene ? 'PRODUCT_TO_CTA' : 'CINEMATIC_PUSH_IN');

      const sceneDiag = await this.renderSingleSceneClip({
        sceneNum,
        duration: sceneDuration,
        width,
        height,
        fps,
        localMediaFile,
        isVideoMedia,
        localLogoPath,
        sceneText,
        captionCues: sceneCues,
        ctaButtonText,
        camera: scene.camera?.[0],
        animationIntent: animIntent,
        brandPrimary,
        brandAccent,
        isCtaScene,
        renderMode: options?.renderMode || 'PRODUCTION',
        outputPath: sceneOutputPath
      });

      intermediateSceneFiles.push(sceneOutputPath);
      sceneDiagnostics.push(sceneDiag);
      sceneArtifacts.push({
        sceneNumber: sceneNum,
        duration: sceneDuration,
        provider: isVideoMedia ? 'veo-3.1-generate-preview' : 'local_renderer',
        source: isVideoMedia ? 'VEO' : (localMediaFile ? 'MEDIA_ASSET' : 'GENERATED'),
        videoUrl: `file://${sceneOutputPath}`,
        localPath: sceneOutputPath,
        width,
        height,
        fps,
        status: 'READY',
        generationMetadata: {
          scenePurpose: scenePlan?.purpose,
          visualType: scenePlan?.visualType
        }
      });

      // Copy to debug dir if debug mode is active
      if (isDebug && fs.existsSync(debugDir)) {
        try {
          await fs.promises.copyFile(
            sceneOutputPath,
            path.join(debugDir, `scene-${sceneNum}-render.mp4`)
          );
          if (localMediaFile) {
            const inputExt = path.extname(localMediaFile) || '.bin';
            await fs.promises.copyFile(
              localMediaFile,
              path.join(debugDir, `scene-${sceneNum}-input${inputExt}`)
            );
          }
        } catch {
          // ignore debug copy error
        }
      }
    }

    // Step C: Audio Resolution (Voiceover + Music Tracks)
    let localVoiceFile: string | null = null;
    let localMusicFile: string | null = null;

    if (spec.audio.voiceTrackUrl) {
      const voiceRes = await MediaAssetDownloader.resolveAndDownload(
        spec.audio.voiceTrackUrl,
        tempDir,
        'voice_track'
      );
      if (voiceRes.success && voiceRes.localPath && fs.existsSync(voiceRes.localPath)) {
        localVoiceFile = voiceRes.localPath;
      }
    }

    if (spec.audio.musicTrackUrl) {
      const musicRes = await MediaAssetDownloader.resolveAndDownload(
        spec.audio.musicTrackUrl,
        tempDir,
        'music_track'
      );
      if (musicRes.success && musicRes.localPath && fs.existsSync(musicRes.localPath)) {
        localMusicFile = musicRes.localPath;
      }
    }

    // Step D: Master Assembly (Concatenate scenes + Mix Audio)
    options?.onProgress?.(72, 'Concatenating scene clips and mixing master audio');
    await this.assembleMasterTimeline({
      intermediateSceneFiles,
      localVoiceFile,
      localMusicFile,
      totalDuration,
      fps,
      outputPath,
      debugDir: isDebug ? debugDir : undefined
    });

    if (isDebug && fs.existsSync(debugDir)) {
      try {
        await fs.promises.copyFile(outputPath, path.join(debugDir, 'final.mp4'));
      } catch {
        // ignore debug copy error
      }
    }

    // Step E: Automated Visual Frame Quality Validation & Reel QA Inspection
    options?.onProgress?.(78, 'Validating rendered video frames for visual quality and platform compliance');
    const sampleDir = isDebug ? path.join(debugDir, 'frame-samples') : undefined;
    const validationResult = await VisualFrameValidator.validateVideo(outputPath, {
      durationSeconds: totalDuration,
      saveSampleImagesToDir: sampleDir
    });

    if (!validationResult.valid) {
      throw new Error(
        `RENDER_VISUAL_VALIDATION_FAILED: ${validationResult.failureReason || 'Final MP4 visual frame quality check failed'}`
      );
    }

    // Comprehensive Reel QA Check
    const qaReportResult = await ReelQAChecker.inspectReel(outputPath, reelPlan, sceneArtifacts, {
      targetDurationSeconds: totalDuration,
      targetWidth: width,
      targetHeight: height,
      saveSampleImagesToDir: sampleDir
    });

    if (!qaReportResult.valid) {
      throw new Error(
        `REEL_QA_FAILED: ${qaReportResult.failureReasons.join('; ')}`
      );
    }

    // Generate comprehensive QA report for debug and traceability
    if (isDebug && fs.existsSync(debugDir)) {
      try {
        const qaReport = {
          reelPlanId: reelPlan.id,
          resolution: `${width}x${height}`,
          fps,
          duration: totalDuration,
          sceneCount: scenes.length,
          productAssetCount: packageAssets.filter((a) => a.assetType === 'PRODUCT_IMAGE' || a.assetType === 'PRODUCT_VIDEO' || a.role === 'PRODUCT').length,
          brandAssetCount: packageAssets.length,
          voicePresent: Boolean(localVoiceFile),
          musicPresent: Boolean(localMusicFile),
          captionPresent: allCues.length > 0,
          visualVariance: validationResult.averageStdDev,
          uniqueColors: validationResult.averageUniqueColors,
          blankFrameDetected: !validationResult.valid,
          productPresence: Boolean(packageAssets.length > 0 || reelPlan.scenes?.some((s) => s.productReference)),
          fallbackUsed: Boolean((reelPlan.productionMetadata as any)?.fallbackUsed),
          renderWarnings: (validationResult as any).warnings || []
        };
        await fs.promises.writeFile(
          path.join(debugDir, 'qa-report.json'),
          JSON.stringify(qaReport, null, 2),
          'utf8'
        );
      } catch {
        // non-blocking
      }
    }

    return {
      tempVideoPath: outputPath,
      durationSeconds: totalDuration,
      width,
      height,
      fps,
      validationResult
    };
  }

  /**
   * Renders a single standalone scene clip (intermediate MP4) with visual media,
   * camera motion, styled text boxes, brand overlays, and exact duration.
   */
  private async renderSingleSceneClip(params: {
    sceneNum: number;
    duration: number;
    width: number;
    height: number;
    fps: number;
    localMediaFile: string | null;
    isVideoMedia: boolean;
    localLogoPath: string | null;
    sceneText?: string;
    captionCues?: Array<{ text: string; startTime: number; endTime: number }>;
    ctaButtonText?: string;
    camera?: any;
    animationIntent?: string;
    brandPrimary: string;
    brandAccent: string;
    isCtaScene?: boolean;
    renderMode?: 'PRODUCTION' | 'PREVIEW';
    outputPath: string;
  }): Promise<{
    sceneNum: number;
    filterGraph: string;
    inputAssets: string[];
    duration: number;
  }> {
    const {
      sceneNum,
      duration,
      width,
      height,
      fps,
      localMediaFile,
      isVideoMedia,
      localLogoPath,
      sceneText,
      captionCues,
      ctaButtonText,
      camera,
      animationIntent,
      brandPrimary,
      brandAccent,
      isCtaScene,
      renderMode = 'PRODUCTION',
      outputPath
    } = params;

    const ffmpegArgs: string[] = [];
    const inputAssets: string[] = [];
    const cleanPrimary = brandPrimary.replace('#', '');
    const cleanAccent = brandAccent.replace('#', '');

    let filterComplex = '';
    let currentStreamLabel = '[v_base]';

    if (localMediaFile && !isVideoMedia) {
      // Product Image: Multi-layer composition with dynamic motion presets
      // Input 0: Product Image (looped)
      inputAssets.push(localMediaFile);
      ffmpegArgs.push('-loop', '1', '-t', `${duration}`, '-i', localMediaFile);

      const productPreset = isCtaScene
        ? 'PRODUCT_TO_CTA'
        : (animationIntent || 'CINEMATIC_PUSH_IN');

      const { productScaleFilter, overlayFilter } = RenderContractAdapter.buildProductOverlayFilter({
        preset: productPreset,
        width,
        height,
        duration
      });

      filterComplex =
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=25:5,eq=brightness=-0.15:saturation=1.2[v_bg];` +
        `[0:v]${productScaleFilter}[v_prod];` +
        `[v_bg][v_prod]${overlayFilter}${currentStreamLabel}`;
    } else if (localMediaFile && isVideoMedia) {
      // Video Media with Camera Motion
      inputAssets.push(localMediaFile);
      ffmpegArgs.push('-stream_loop', '-1', '-i', localMediaFile);
      const cameraFilter = RenderContractAdapter.buildCameraFilter(
        camera,
        width,
        height,
        fps,
        duration
      );
      filterComplex = `[0:v]${cameraFilter}${currentStreamLabel}`;
    } else {
      // If production render requires real media but none was found, block and fail
      if (renderMode !== 'PREVIEW') {
        throw new Error(`MEDIA_ASSET_UNAVAILABLE: Scene #${sceneNum} lacks a valid ready visual media asset. Production renders require real product/brand media assets.`);
      }

      // High-contrast animated gradient backdrop only for explicit PREVIEW mode
      ffmpegArgs.push(
        '-f', 'lavfi',
        '-i', `gradients=s=${width}x${height}:d=${duration}:r=${fps}:c0=0x${cleanPrimary}:c1=0x${cleanAccent}:speed=0.01`
      );
      filterComplex = `[0:v]format=yuv420p${currentStreamLabel}`;
    }

    // Add Timed Caption Overlays if caption cues exist
    if (captionCues && captionCues.length > 0) {
      captionCues.forEach((cue, cueIdx) => {
        const escaped = cue.text.replace(/\\/g, '\\\\').replace(/'/g, "'\\''").replace(/:/g, '\\:');
        const drawText = `:drawtext=text='${escaped}':enable='between(t\\,${cue.startTime.toFixed(2)}\\,${cue.endTime.toFixed(2)})':fontcolor=white:fontsize=46:box=1:boxcolor=0x000000@0.75:boxborderw=12:x=(w-text_w)/2:y=h*0.74`;
        filterComplex += `;${currentStreamLabel}${drawText}[v_cue_${cueIdx}]`;
        currentStreamLabel = `[v_cue_${cueIdx}]`;
      });
    } else if (sceneText && sceneText.trim().length > 0) {
      // Fallback Styled Text Overlay if no timed cues
      const yRatio = isCtaScene ? 0.68 : 0.72;
      const textFilter = this.buildDrawTextFilter(sceneText, {
        yRatio,
        fontSize: 50,
        fontColor: 'white',
        boxColor: '0x000000@0.75'
      });
      if (textFilter) {
        filterComplex += `;${currentStreamLabel}${textFilter}[v_text]`;
        currentStreamLabel = '[v_text]';
      }
    }

    // Add CTA Button Pill for End Scene
    if (ctaButtonText && ctaButtonText.trim().length > 0) {
      const ctaFilter = this.buildDrawTextFilter(ctaButtonText.toUpperCase(), {
        yRatio: 0.84,
        fontSize: 44,
        fontColor: 'white',
        boxColor: `0x${cleanAccent}@0.95`
      });
      if (ctaFilter) {
        filterComplex += `;${currentStreamLabel}${ctaFilter}[v_cta]`;
        currentStreamLabel = '[v_cta]';
      }
    }

    // Add Brand Logo Overlay if logo exists
    if (localLogoPath && fs.existsSync(localLogoPath)) {
      inputAssets.push(localLogoPath);
      ffmpegArgs.push('-i', localLogoPath);
      const logoInputIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
      if (isCtaScene) {
        // Prominent centered brand logo on final CTA scene
        filterComplex += `;[${logoInputIdx}:v]scale=220:-1[logo];${currentStreamLabel}[logo]overlay=x=(W-w)/2:y=H*0.12[v_logo]`;
      } else {
        // Subtle corner watermark for introductory scenes
        filterComplex += `;[${logoInputIdx}:v]scale=140:-1[logo];${currentStreamLabel}[logo]overlay=x=60:y=80[v_logo]`;
      }
      currentStreamLabel = '[v_logo]';
    }

    ffmpegArgs.push(
      '-t', `${duration}`,
      '-filter_complex', filterComplex,
      '-map', currentStreamLabel,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-y',
      outputPath
    );

    await this.runFfmpegProcess(ffmpegArgs);

    return {
      sceneNum,
      filterGraph: filterComplex,
      inputAssets,
      duration
    };
  }

  /**
   * Assembles all intermediate scene MP4 clips into a master timeline and mixes audio tracks.
   */
  private async assembleMasterTimeline(params: {
    intermediateSceneFiles: string[];
    localVoiceFile: string | null;
    localMusicFile: string | null;
    totalDuration: number;
    fps: number;
    outputPath: string;
    debugDir?: string;
  }): Promise<void> {
    const {
      intermediateSceneFiles,
      localVoiceFile,
      localMusicFile,
      totalDuration,
      outputPath,
      debugDir
    } = params;

    const ffmpegArgs: string[] = [];

    // Inputs 0 .. N-1: Intermediate scene MP4 files
    for (const sceneFile of intermediateSceneFiles) {
      ffmpegArgs.push('-i', sceneFile);
    }

    // Concat video filter graph
    const sceneInputs = intermediateSceneFiles.map((_, idx) => `[${idx}:v]`).join('');
    let filterComplex = `${sceneInputs}concat=n=${intermediateSceneFiles.length}:v=1:a=0[v]`;

    let voiceInputIdx = -1;
    let musicInputIdx = -1;

    if (localVoiceFile) {
      ffmpegArgs.push('-i', localVoiceFile);
      voiceInputIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
    }

    if (localMusicFile) {
      ffmpegArgs.push('-stream_loop', '-1', '-i', localMusicFile);
      musicInputIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
    }

    // Audio mixing with ducking
    if (voiceInputIdx >= 0 && musicInputIdx >= 0) {
      filterComplex += `;[${voiceInputIdx}:a]volume=1.0[va];[${musicInputIdx}:a]volume=0.25[ma];[va][ma]amix=inputs=2:duration=first[a]`;
    } else if (voiceInputIdx >= 0) {
      filterComplex += `;[${voiceInputIdx}:a]volume=1.0[a]`;
    } else if (musicInputIdx >= 0) {
      filterComplex += `;[${musicInputIdx}:a]volume=0.6[a]`;
    } else {
      ffmpegArgs.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
      const nullIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
      filterComplex += `;[${nullIdx}:a]volume=0.0[a]`;
    }

    ffmpegArgs.push(
      '-t', `${totalDuration}`,
      '-filter_complex', filterComplex,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      '-y',
      outputPath
    );

    if (debugDir) {
      try {
        await fs.promises.writeFile(
          path.join(debugDir, 'ffmpeg-command.txt'),
          `ffmpeg ${ffmpegArgs.join(' ')}\n`,
          'utf8'
        );
      } catch {
        // ignore debug logging error
      }
    }

    await this.runFfmpegProcess(ffmpegArgs);
  }

  /**
   * Constructs a safe, cross-platform drawtext filter expression.
   */
  private buildDrawTextFilter(
    text: string,
    options: {
      yRatio?: number;
      fontSize?: number;
      fontColor?: string;
      boxColor?: string;
    }
  ): string {
    const sanitized = text
      .replace(/\x27/g, "\u2019")
      .replace(/:/g, ' - ')
      .replace(/%/g, ' percent')
      .replace(/\\/g, '/')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    if (!sanitized) return '';

    const fontFile = this.getAvailableFontFile();
    const fontArg = fontFile ? `fontfile='${fontFile.replace(/:/g, '\\:')}':` : '';
    const fontSize = options.fontSize || 48;
    const fontColor = options.fontColor || 'white';
    const boxColor = options.boxColor || '0x000000@0.75';
    const yRatio = options.yRatio ?? 0.72;

    return `drawtext=${fontArg}text='${sanitized}':fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${boxColor}:boxborderw=18:x=(w-text_w)/2:y=h*${yRatio}-(text_h/2)`;
  }

  private getAvailableFontFile(): string | null {
    if (process.platform === 'win32') {
      const winFonts = [
        'C:/Windows/Fonts/arialbd.ttf',
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/segoeuib.ttf',
        'C:/Windows/Fonts/segoeui.ttf'
      ];
      for (const f of winFonts) {
        if (fs.existsSync(f)) return f;
      }
    } else {
      const unixFonts = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'
      ];
      for (const f of unixFonts) {
        if (fs.existsSync(f)) return f;
      }
    }
    return null;
  }

  private createFallbackSceneSpec(duration: number): AdaptedSceneSpec {
    return {
      sceneNumber: 1,
      startTime: 0,
      endTime: duration,
      duration,
      backgroundColor: '#1E293B',
      camera: [],
      textAnimations: [],
      productAnimations: [],
      logoAnimations: [],
      syncCues: []
    };
  }

  private runFfmpegProcess(args: string[], timeoutMs = 180000): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stderrOutput = '';
      let isSettled = false;

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            ffmpeg.kill('SIGKILL');
          } catch {
            // ignore
          }
          reject(new Error(`FFmpeg process timed out after ${timeoutMs / 1000} seconds`));
        }
      }, timeoutMs);
      timer.unref?.();

      ffmpeg.stderr.on('data', (data) => {
        stderrOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        clearTimeout(timer);
        if (isSettled) return;
        isSettled = true;

        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderrOutput.slice(-500)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        clearTimeout(timer);
        if (isSettled) return;
        isSettled = true;
        reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
      });
    });
  }

  // -------------------------------------------------------------
  // VideoRenderer interface compliance (Phase 1 placeholder contract)
  // -------------------------------------------------------------

  async submitRenderJob(_spec: RenderTimelineSpec): Promise<{ jobId: string }> {
    const jobId = `job_${Date.now()}`;
    return { jobId };
  }

  async getRenderJobStatus(jobId: string): Promise<RenderJobStatus> {
    return {
      jobId,
      status: 'completed',
      progressPercentage: 100,
      completedAt: new Date()
    };
  }

  async cancelRenderJob(_jobId: string): Promise<boolean> {
    return true;
  }
}
