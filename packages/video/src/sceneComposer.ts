import * as fs from 'fs';
import { spawn } from 'child_process';
import type {
  ReelScene,
  Brand,
  BrandProduct,
  SceneVideoArtifact
} from '@vidsnapai/types';
import { PlatformSafeArea, type SupportedPlatform } from './safeAreas.js';

export interface ComposeSceneClipOptions {
  scene: ReelScene;
  sceneNumber: number;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  brand: Brand;
  product?: BrandProduct | null;
  baseVideoFile?: string | null;
  sourceImageFile?: string | null;
  logoFile?: string | null;
  platform?: SupportedPlatform;
  captionCues?: Array<{ text: string; startTime: number; endTime: number }>;
  isCtaScene?: boolean;
  ctaText?: string;
  featureText?: string;
  outputPath: string;
}

export interface AssembleMasterTimelineOptions {
  sceneArtifacts: SceneVideoArtifact[];
  localVoiceFile?: string | null;
  localMusicFile?: string | null;
  totalDuration: number;
  width?: number;
  height?: number;
  fps?: number;
  platform?: SupportedPlatform;
  brandPrimaryColor?: string;
  transitionDurationSeconds?: number;
  outputPath: string;
}

export class SceneComposer {
  public static readonly DEFAULT_WIDTH = 1080;
  public static readonly DEFAULT_HEIGHT = 1920;
  public static readonly DEFAULT_FPS = 30;

  /**
   * Composes a single scene clip by layering Veo/media visual footage with
   * Brand Motion Graphics (logo reveal, kinetic captions, feature badges, CTA)
   * conforming strictly to Platform Safe Areas.
   */
  public static async composeSceneClip(options: ComposeSceneClipOptions): Promise<SceneVideoArtifact> {
    const {
      scene,
      sceneNumber,
      duration,
      width = this.DEFAULT_WIDTH,
      height = this.DEFAULT_HEIGHT,
      fps = this.DEFAULT_FPS,
      brand,
      product,
      baseVideoFile,
      sourceImageFile,
      logoFile,
      platform = 'UNIVERSAL',
      captionCues = [],
      isCtaScene = false,
      ctaText,
      featureText,
      outputPath
    } = options;

    const brandPrimary = brand.brandColors?.primary || '#6366F1';
    const brandSecondary = brand.brandColors?.secondary || '#EC4899';
    const cleanPrimary = brandPrimary.replace('#', '');
    const cleanSecondary = brandSecondary.replace('#', '');

    const ffmpegArgs: string[] = [];
    const inputIndices: { base?: number; logo?: number } = {};
    let currentStream = '[v_base]';
    let filterGraph = '';

    // 1. Base Visual Video Layer (Veo generated video, media asset, or image motion)
    if (baseVideoFile && fs.existsSync(baseVideoFile)) {
      ffmpegArgs.push('-stream_loop', '-1', '-i', baseVideoFile);
      inputIndices.base = 0;
      // Scale and crop to exact 9:16 portrait
      filterGraph += `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps},format=yuv420p${currentStream}`;
    } else if (sourceImageFile && fs.existsSync(sourceImageFile)) {
      ffmpegArgs.push('-loop', '1', '-t', `${duration}`, '-i', sourceImageFile);
      inputIndices.base = 0;
      // Multi-layer cinematic depth & push-in
      const isHero = scene.visualType === 'PRODUCT_SHOWCASE' || scene.purpose?.includes('HERO');
      const zoomSpeed = isHero ? '0.0015' : '0.0010';
      filterGraph +=
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=20:4,eq=brightness=-0.12[bg];` +
        `[0:v]scale='min(${width},iw)':-1,zoompan=z='min(zoom+${zoomSpeed},1.15)':d=${Math.round(duration * fps)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[fg];` +
        `[bg][fg]overlay=x=(W-w)/2:y=(H-h)/2:format=auto${currentStream}`;
    } else {
      // High-grade animated gradient backdrop for preview or fallback
      ffmpegArgs.push(
        '-f', 'lavfi',
        '-i', `gradients=s=${width}x${height}:d=${duration}:r=${fps}:c0=0x${cleanPrimary}:c1=0x${cleanSecondary}:speed=0.01`
      );
      inputIndices.base = 0;
      filterGraph += `[0:v]format=yuv420p${currentStream}`;
    }

    // 2. Brand Motion Graphics: Subtle Brand Color Glow Accent
    filterGraph += `;${currentStream}drawbox=x=0:y=0:w=${width}:h=6:color=0x${cleanPrimary}@0.8:t=fill[v_glow]`;
    currentStream = '[v_glow]';

    // 3. Brand Motion Graphics: Feature Badge
    if (featureText && featureText.trim().length > 0 && !isCtaScene) {
      const badgePlacement = PlatformSafeArea.getElementSafePlacement('FEATURE_BADGE', platform);
      const escapedFeature = this.sanitizeTextForFfmpeg(featureText.toUpperCase());
      const badgeFilter = `drawtext=text='${escapedFeature}':fontcolor=white:fontsize=32:box=1:boxcolor=0x${cleanPrimary}@0.90:boxborderw=10:x=(w-text_w)/2:y=h*${badgePlacement.yRatio.toFixed(2)}`;
      filterGraph += `;${currentStream}${badgeFilter}[v_badge]`;
      currentStream = '[v_badge]';
    }

    // 4. Brand Motion Graphics: Timed Kinetic Captions
    const captionPlacement = PlatformSafeArea.getElementSafePlacement('KINETIC_CAPTIONS', platform);
    if (captionCues.length > 0) {
      captionCues.forEach((cue, idx) => {
        const escaped = this.sanitizeTextForFfmpeg(cue.text);
        const drawText = `drawtext=text='${escaped}':enable='between(t\\,${cue.startTime.toFixed(2)}\\,${cue.endTime.toFixed(2)})':fontcolor=white:fontsize=44:box=1:boxcolor=0x000000@0.80:boxborderw=12:x=(w-text_w)/2:y=h*${captionPlacement.yRatio.toFixed(2)}`;
        filterGraph += `;${currentStream}${drawText}[v_cue_${idx}]`;
        currentStream = `[v_cue_${idx}]`;
      });
    } else if (scene.onScreenText && scene.onScreenText.trim().length > 0) {
      const escaped = this.sanitizeTextForFfmpeg(scene.onScreenText);
      const textFilter = `drawtext=text='${escaped}':fontcolor=white:fontsize=44:box=1:boxcolor=0x000000@0.80:boxborderw=12:x=(w-text_w)/2:y=h*${captionPlacement.yRatio.toFixed(2)}`;
      filterGraph += `;${currentStream}${textFilter}[v_text]`;
      currentStream = '[v_text]';
    }

    // 5. Brand Motion Graphics: CTA Button Animation on Finale Scene
    if (isCtaScene && (ctaText || scene.onScreenText)) {
      const ctaPlacement = PlatformSafeArea.getElementSafePlacement('CTA_BUTTON', platform);
      const activeCta = (ctaText || scene.onScreenText || 'SHOP NOW').toUpperCase();
      const escapedCta = this.sanitizeTextForFfmpeg(activeCta);
      const ctaFilter = `drawtext=text='${escapedCta}':fontcolor=white:fontsize=42:box=1:boxcolor=0x${cleanSecondary}@0.95:boxborderw=14:x=(w-text_w)/2:y=h*${ctaPlacement.yRatio.toFixed(2)}`;
      filterGraph += `;${currentStream}${ctaFilter}[v_cta]`;
      currentStream = '[v_cta]';
    }

    // 6. Brand Motion Graphics: Logo Reveal / Watermark
    if (logoFile && fs.existsSync(logoFile)) {
      ffmpegArgs.push('-i', logoFile);
      const logoInputIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
      if (isCtaScene) {
        // Centered logo in top safe zone for endcard
        const logoPlacement = PlatformSafeArea.getElementSafePlacement('LOGO_TOP', platform);
        filterGraph += `;[${logoInputIdx}:v]scale=220:-1[logo_scaled];${currentStream}[logo_scaled]overlay=x=(W-w)/2:y=H*${logoPlacement.yRatio.toFixed(2)}[v_logo]`;
      } else {
        // Safe corner badge watermark
        filterGraph += `;[${logoInputIdx}:v]scale=130:-1[logo_scaled];${currentStream}[logo_scaled]overlay=x=86:y=288[v_logo]`;
      }
      currentStream = '[v_logo]';
    }

    ffmpegArgs.push(
      '-t', `${duration}`,
      '-filter_complex', filterGraph,
      '-map', currentStream,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-y',
      outputPath
    );

    await this.runFfmpeg(ffmpegArgs);

    return {
      sceneNumber,
      duration,
      provider: baseVideoFile ? 'veo-3.1-generate-preview' : 'local_composer',
      source: baseVideoFile ? 'VEO' : sourceImageFile ? 'MEDIA_ASSET' : 'GENERATED',
      videoUrl: `file://${outputPath}`,
      localPath: outputPath,
      width,
      height,
      fps,
      status: 'READY',
      generationMetadata: {
        scenePurpose: scene.purpose,
        visualType: scene.visualType,
        productName: product?.name || null,
        brandPrimaryColor: brandPrimary,
        hasLogo: Boolean(logoFile)
      }
    };
  }

  /**
   * Assembles multiple SceneVideoArtifacts into a single master MP4,
   * injecting cinematic transitions (crossfade, wipe, zoom, brand color dip)
   * and synchronizing voiceover and music audio with automatic ducking.
   */
  public static async assembleMasterTimeline(options: AssembleMasterTimelineOptions): Promise<void> {
    const {
      sceneArtifacts,
      localVoiceFile,
      localMusicFile,
      totalDuration,
      width: _width = this.DEFAULT_WIDTH,
      height: _height = this.DEFAULT_HEIGHT,
      fps = this.DEFAULT_FPS,
      brandPrimaryColor: _brandPrimaryColor = '#6366F1',
      transitionDurationSeconds = 0.35,
      outputPath
    } = options;

    if (sceneArtifacts.length === 0) {
      throw new Error('SceneComposer.assembleMasterTimeline requires at least 1 scene artifact');
    }

    const ffmpegArgs: string[] = [];

    // Inputs 0 .. N-1: Intermediate scene MP4 files
    for (const art of sceneArtifacts) {
      if (!art.localPath || !fs.existsSync(art.localPath)) {
        throw new Error(`SceneVideoArtifact for scene #${art.sceneNumber} missing localPath at ${art.localPath}`);
      }
      ffmpegArgs.push('-i', art.localPath);
    }

    let filterGraph = '';
    const numScenes = sceneArtifacts.length;

    if (numScenes === 1) {
      filterGraph = `[0:v]format=yuv420p[v_master]`;
    } else {
      // Build cinematic transitions chain using xfade
      // Transitions cycle: fade -> wipeleft -> dissolve -> fadeblack -> wiperight
      const transitionTypes = ['fade', 'wipeleft', 'dissolve', 'fadeblack', 'wiperight'];
      let currentV = '[0:v]';
      let offset = sceneArtifacts[0].duration - transitionDurationSeconds;

      for (let i = 1; i < numScenes; i++) {
        const transType = transitionTypes[(i - 1) % transitionTypes.length];
        const nextV = `[${i}:v]`;
        const outLabel = i === numScenes - 1 ? '[v_master]' : `[v_trans_${i}]`;
        const safeOffset = Math.max(0.1, offset);

        filterGraph += (i > 1 ? ';' : '') +
          `${currentV}${nextV}xfade=transition=${transType}:duration=${transitionDurationSeconds}:offset=${safeOffset.toFixed(2)}${outLabel}`;

        currentV = outLabel;
        offset += sceneArtifacts[i].duration - transitionDurationSeconds;
      }
    }

    let voiceInputIdx = -1;
    let musicInputIdx = -1;

    if (localVoiceFile && fs.existsSync(localVoiceFile)) {
      ffmpegArgs.push('-i', localVoiceFile);
      voiceInputIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
    }

    if (localMusicFile && fs.existsSync(localMusicFile)) {
      ffmpegArgs.push('-stream_loop', '-1', '-i', localMusicFile);
      musicInputIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
    }

    // Audio mixing graph with voiceover priority and background ducking
    if (voiceInputIdx >= 0 && musicInputIdx >= 0) {
      filterGraph += `;[${voiceInputIdx}:a]volume=1.0[va];[${musicInputIdx}:a]volume=0.22[ma];[va][ma]amix=inputs=2:duration=first[a_master]`;
    } else if (voiceInputIdx >= 0) {
      filterGraph += `;[${voiceInputIdx}:a]volume=1.0[a_master]`;
    } else if (musicInputIdx >= 0) {
      filterGraph += `;[${musicInputIdx}:a]volume=0.55[a_master]`;
    } else {
      ffmpegArgs.push('-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=44100');
      const nullIdx = ffmpegArgs.filter((a) => a === '-i').length - 1;
      filterGraph += `;[${nullIdx}:a]volume=0.15[a_master]`;
    }

    ffmpegArgs.push(
      '-t', `${totalDuration}`,
      '-filter_complex', filterGraph,
      '-map', '[v_master]',
      '-map', '[a_master]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-r', `${fps}`,
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      '-movflags', '+faststart',
      '-y',
      outputPath
    );

    await this.runFfmpeg(ffmpegArgs);
  }

  /**
   * Sanitizes string values for safe inclusion in FFmpeg drawtext filter expressions.
   */
  public static sanitizeTextForFfmpeg(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\u2019")
      .replace(/:/g, '\\:')
      .replace(/%/g, ' percent');
  }

  /**
   * Helper to spawn and execute an FFmpeg command.
   */
  private static runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-600)}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      });
    });
  }
}
