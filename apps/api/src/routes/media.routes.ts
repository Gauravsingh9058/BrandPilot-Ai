import { Router, type Request, type Response, type NextFunction } from 'express';
import { getDatabase, WorkspaceRepository } from '@vidsnapai/database';
import { getConfig } from '@vidsnapai/config';
import { requireAuth } from '../middleware/auth.js';
import {
  MediaService,
  PexelsProvider,
  ReelAssetRepository
} from '@vidsnapai/media';
import { VoiceService } from '@vidsnapai/voice';
import { CaptionService } from '@vidsnapai/captions';
import { AudioService } from '@vidsnapai/audio';
import { LocalStorageProvider } from '@vidsnapai/storage';
import {
  ReelProductionPlanRepository,
  ProductionPackageService
} from '@vidsnapai/video';
import { BrandRepository, AssetRepository as BrandAssetRepository } from '@vidsnapai/brand';
import {
  ResolveMediaInputSchema,
  ResolveSceneMediaInputSchema,
  GenerateVoiceInputSchema,
  GenerateCaptionsInputSchema,
  UpdateCaptionTrackSchema,
  ResolveAudioInputSchema,
  UpdateReelAssetSchema
} from '@vidsnapai/validation';
import { AppError } from '../middleware/error-handler.js';

export const mediaRouter: Router = Router();

const db = getDatabase();
const workspaceRepo = new WorkspaceRepository(db);

// Helper to resolve workspace
async function resolveActiveWorkspaceId(req: Request): Promise<string> {
  const headerWs = req.headers['x-workspace-id'];
  if (typeof headerWs === 'string' && headerWs.length > 0) {
    const role = await workspaceRepo.getUserRole(headerWs, req.user!.id);
    if (!role) {
      throw new AppError('Unauthorized access to specified workspace', 403, 'WORKSPACE_ACCESS_DENIED');
    }
    return headerWs;
  }

  const queryWs = req.query.workspaceId;
  if (typeof queryWs === 'string' && queryWs.length > 0) {
    const role = await workspaceRepo.getUserRole(queryWs, req.user!.id);
    if (!role) {
      throw new AppError('Unauthorized access to specified workspace', 403, 'WORKSPACE_ACCESS_DENIED');
    }
    return queryWs;
  }

  const userWorkspaces = await workspaceRepo.listForUser(req.user!.id);
  if (userWorkspaces.length === 0) {
    throw new AppError('User has no accessible workspaces', 403, 'NO_WORKSPACES');
  }

  return userWorkspaces[0].id;
}

// Helper to check reel access & return reel plan
async function getAuthorizedReelPlan(
  reelPlanId: string,
  req: Request,
  res: Response
) {
  const reelRepo = new ReelProductionPlanRepository(db);

  const reelPlan = await reelRepo.findById(reelPlanId);
  if (!reelPlan) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Reel blueprint with ID "${reelPlanId}" not found.`
      }
    });
    return null;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
    return null;
  }

  const role = await workspaceRepo.getUserRole(reelPlan.workspaceId, userId);
  if (!role) {
    res.status(403).json({
      error: {
        code: 'WORKSPACE_ACCESS_DENIED',
        message: 'Access denied: You do not belong to this workspace.'
      }
    });
    return null;
  }

  return reelPlan;
}

// ----------------------------------------------------
// Media Resolution Endpoints
// ----------------------------------------------------

/**
 * POST /api/reels/:reelId/media/resolve
 * Resolves media assets for all scenes in the Reel plan.
 */
mediaRouter.post(
  '/reels/:reelId/media/resolve',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const input = ResolveMediaInputSchema.parse(req.body || {});
      const config = getConfig();

      const pexelsProvider = config.PEXELS_API_KEY
        ? new PexelsProvider({ apiKey: config.PEXELS_API_KEY })
        : undefined;

      const mediaService = new MediaService(db, pexelsProvider);
      const packageService = new ProductionPackageService(db);

      const result = await mediaService.resolveReelMedia(
        reelPlan,
        reelPlan.workspaceId,
        input
      );

      // Re-evaluate production package
      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/scenes/:sceneNumber/media/resolve
 * Resolves or regenerates media asset for a single scene.
 */
mediaRouter.post(
  '/reels/:reelId/scenes/:sceneNumber/media/resolve',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const sceneNum = parseInt(req.params.sceneNumber as string, 10);
      if (isNaN(sceneNum) || sceneNum < 1) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Valid sceneNumber is required.' } });
        return;
      }

      const input = ResolveSceneMediaInputSchema.parse(req.body || {});
      const config = getConfig();

      const pexelsProvider = config.PEXELS_API_KEY
        ? new PexelsProvider({ apiKey: config.PEXELS_API_KEY })
        : undefined;

      const mediaService = new MediaService(db, pexelsProvider);
      const packageService = new ProductionPackageService(db);

      const asset = await mediaService.resolveSceneMedia(
        reelPlan,
        sceneNum,
        reelPlan.workspaceId,
        input
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reels/:reelId/assets
 * Lists all assets attached to the Reel plan.
 */
mediaRouter.get(
  '/reels/:reelId/assets',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const mediaService = new MediaService(db);
      const assets = await mediaService.listReelAssets(reelPlan.id);

      res.json({
        success: true,
        data: { assets }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/scenes/:sceneNumber/media/stock/search
 * Searches stock media for a scene.
 */
mediaRouter.post(
  '/reels/:reelId/scenes/:sceneNumber/media/stock/search',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const { query, orientation = 'portrait', type = 'video', page = 1, perPage = 15 } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Search query is required.' } });
        return;
      }

      const config = getConfig();
      const pexelsProvider = new PexelsProvider({
        apiKey: config.PEXELS_API_KEY || 'mock-pexels-key'
      });

      const searchResult = type === 'image'
        ? await pexelsProvider.searchImages({ query, orientation, page, perPage })
        : await pexelsProvider.searchVideos({ query, orientation, page, perPage });

      res.json({
        success: true,
        data: searchResult
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/scenes/:sceneNumber/media/stock/select
 * Manually selects a stock media asset for a scene.
 */
mediaRouter.post(
  '/reels/:reelId/scenes/:sceneNumber/media/stock/select',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const sceneNum = parseInt(req.params.sceneNumber as string, 10);
      const { mediaAsset } = req.body;
      if (!mediaAsset || !mediaAsset.url) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Valid mediaAsset object is required.' } });
        return;
      }

      const mediaService = new MediaService(db);
      const packageService = new ProductionPackageService(db);

      const asset = await mediaService.manuallySelectSceneAsset(
        reelPlan,
        sceneNum,
        reelPlan.workspaceId,
        mediaAsset
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/scenes/:sceneNumber/media/local
 * Uploads a local image or video file for a specific scene.
 */
mediaRouter.post(
  '/reels/:reelId/scenes/:sceneNumber/media/local',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const sceneNum = parseInt(req.params.sceneNumber as string, 10);
      const { base64Data, filename, mimeType, durationSeconds, width, height } = req.body;
      if (!base64Data || !filename || !mimeType) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'base64Data, filename, and mimeType are required.' } });
        return;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const mediaService = new MediaService(db);
      const packageService = new ProductionPackageService(db);

      const asset = await mediaService.uploadLocalSceneMedia(
        reelPlan,
        sceneNum,
        reelPlan.workspaceId,
        { buffer, filename, mimeType, durationSeconds, width, height }
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { asset }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/reels/assets/:assetId
 * Updates properties of a reel asset.
 */
mediaRouter.patch(
  '/reels/assets/:assetId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = UpdateReelAssetSchema.parse(req.body);
      const reelAssetRepo = new ReelAssetRepository(db);

      const asset = await reelAssetRepo.findById(req.params.assetId as string);
      if (!asset) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found.' } });
        return;
      }

      const role = await workspaceRepo.getUserRole(asset.workspaceId, req.user!.id);
      if (!role) {
        res.status(403).json({ error: { code: 'WORKSPACE_ACCESS_DENIED', message: 'Access denied.' } });
        return;
      }

      const updated = await reelAssetRepo.update(asset.id, asset.workspaceId, input);

      if (asset.reelPlanId) {
        const packageService = new ProductionPackageService(db);
        await packageService.compilePackage(asset.reelPlanId, asset.workspaceId);
      }

      res.json({
        success: true,
        data: { asset: updated }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------
// Voice Synthesis Endpoints
// ----------------------------------------------------

/**
 * GET /api/voice/voices
 * Lists available voice options.
 */
mediaRouter.get(
  '/voice/voices',
  requireAuth,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const voiceService = new VoiceService(db);
      const voices = await voiceService.listAvailableVoices();
      res.json({
        success: true,
        data: { voices }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/voice/generate
 * Generates synthetic voice narration for the Reel plan.
 */
mediaRouter.post(
  '/reels/:reelId/voice/generate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const input = GenerateVoiceInputSchema.parse(req.body || {});
      const voiceService = new VoiceService(db);
      const packageService = new ProductionPackageService(db);

      const voiceAsset = await voiceService.generateVoiceTrack(
        reelPlan,
        reelPlan.workspaceId,
        input
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { voiceAsset }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/voice/local
 * Uploads a local voice narration audio file.
 */
mediaRouter.post(
  '/reels/:reelId/voice/local',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const { base64Data, filename, mimeType, durationSeconds } = req.body;
      if (!base64Data || !filename || !mimeType) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'base64Data, filename, and mimeType are required.' } });
        return;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const voiceService = new VoiceService(db);
      const packageService = new ProductionPackageService(db);

      const voiceAsset = await voiceService.uploadVoiceTrack(
        reelPlan,
        reelPlan.workspaceId,
        { buffer, filename, mimeType, durationSeconds }
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { voiceAsset }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------
// Captions Engine Endpoints
// ----------------------------------------------------

/**
 * POST /api/reels/:reelId/captions/generate
 * Generates kinetic caption track with word-level cues.
 */
mediaRouter.post(
  '/reels/:reelId/captions/generate',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const input = GenerateCaptionsInputSchema.parse(req.body || {});
      const captionService = new CaptionService(db);
      const packageService = new ProductionPackageService(db);

      const captionTrack = await captionService.generateCaptionTrack(
        reelPlan,
        reelPlan.workspaceId,
        input
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { captionTrack }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reels/:reelId/captions
 * Gets the current caption track for a Reel plan.
 */
mediaRouter.get(
  '/reels/:reelId/captions',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const captionService = new CaptionService(db);
      const captionTrack = await captionService.getCaptionTrack(reelPlan.id);

      res.json({
        success: true,
        data: { captionTrack }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/reels/captions/:trackId
 * Updates caption style or word cues directly.
 */
mediaRouter.patch(
  '/reels/captions/:trackId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = UpdateCaptionTrackSchema.parse(req.body);
      const captionService = new CaptionService(db);
      const track = await captionService.getCaptionTrackById(req.params.trackId as string);

      if (!track) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Caption track not found.' } });
        return;
      }

      const role = await workspaceRepo.getUserRole(track.workspaceId, req.user!.id);
      if (!role) {
        res.status(403).json({ error: { code: 'WORKSPACE_ACCESS_DENIED', message: 'Access denied.' } });
        return;
      }

      const updated = await captionService.updateCaptionTrack(
        track.id,
        track.workspaceId,
        input
      );

      if (track.reelPlanId) {
        const packageService = new ProductionPackageService(db);
        await packageService.compilePackage(track.reelPlanId, track.workspaceId);
      }

      res.json({
        success: true,
        data: { captionTrack: updated }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------
// Audio Mix & SFX Endpoints
// ----------------------------------------------------

/**
 * POST /api/reels/:reelId/audio/resolve
 * Resolves music, SFX cues, and ducking audio mix plan.
 */
mediaRouter.post(
  '/reels/:reelId/audio/resolve',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const input = ResolveAudioInputSchema.parse(req.body || {});
      const audioService = new AudioService(db);
      const packageService = new ProductionPackageService(db);

      const audioMixPlan = await audioService.resolveAudioPlan(
        reelPlan,
        reelPlan.workspaceId,
        input
      );

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { audioMixPlan }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reels/:reelId/audio
 * Gets the current audio mix plan.
 */
mediaRouter.get(
  '/reels/:reelId/audio',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const audioService = new AudioService(db);
      const audioMixPlan = await audioService.getAudioMixPlan(reelPlan.id);

      res.json({
        success: true,
        data: { audioMixPlan }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/audio/local
 * Uploads a local music or SFX track.
 */
mediaRouter.post(
  '/reels/:reelId/audio/local',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const { base64Data, filename, mimeType, type, sceneNumber, durationSeconds } = req.body;
      if (!base64Data || !filename || !mimeType) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'base64Data, filename, and mimeType are required.' } });
        return;
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const audioService = new AudioService(db);
      const packageService = new ProductionPackageService(db);

      let audioMixPlan;
      if (type === 'SFX') {
        audioMixPlan = await audioService.uploadLocalSFX(
          reelPlan,
          reelPlan.workspaceId,
          { buffer, filename, mimeType, durationSeconds },
          sceneNumber
        );
      } else {
        audioMixPlan = await audioService.uploadLocalMusic(
          reelPlan,
          reelPlan.workspaceId,
          { buffer, filename, mimeType, durationSeconds }
        );
      }

      await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { audioMixPlan }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------
// Production Package & Readiness Endpoints
// ----------------------------------------------------

/**
 * GET /api/reels/:reelId/production-package
 * Gets the compiled production package and readiness evaluation.
 */
mediaRouter.get(
  '/reels/:reelId/production-package',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const packageService = new ProductionPackageService(db);

      let pkg = await packageService.getPackage(reelPlan.id, reelPlan.workspaceId);
      if (!pkg) {
        pkg = await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);
      }

      res.json({
        success: true,
        data: { productionPackage: pkg }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reels/:reelId/production-package
 * Re-compiles and re-evaluates the production package.
 */
mediaRouter.post(
  '/reels/:reelId/production-package',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reelPlan = await getAuthorizedReelPlan(req.params.reelId as string, req, res);
      if (!reelPlan) return;

      const packageService = new ProductionPackageService(db);
      const pkg = await packageService.compilePackage(reelPlan.id, reelPlan.workspaceId);

      res.json({
        success: true,
        data: { productionPackage: pkg }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------
// Brand Asset Library & Storage Upload
// ----------------------------------------------------

/**
 * GET /api/brands/:brandId/assets
 * Lists all assets belonging to brand across Brand Library and Reel Blueprints.
 */
mediaRouter.get(
  '/brands/:brandId/assets',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const brandRepo = new BrandRepository(db);
      const brandAssetRepo = new BrandAssetRepository(db);
      const reelAssetRepo = new ReelAssetRepository(db);

      const activeWs = await resolveActiveWorkspaceId(req);
      const brand = await brandRepo.findByIdAndWorkspace(req.params.brandId as string, activeWs);
      if (!brand) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Brand not found in this workspace.' } });
        return;
      }

      const [brandAssets, reelAssets] = await Promise.all([
        brandAssetRepo.listForBrand(brand.id),
        reelAssetRepo.listByBrandId(brand.id)
      ]);

      res.json({
        success: true,
        data: {
          brandAssets,
          reelAssets
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/storage/upload
 * Authenticated general local file upload.
 */
mediaRouter.post(
  '/storage/upload',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { base64Data, filename, mimeType, folder } = req.body;
      if (!base64Data || !filename || !mimeType) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'base64Data, filename, and mimeType are required.' } });
        return;
      }

      const activeWs = await resolveActiveWorkspaceId(req);
      const buffer = Buffer.from(base64Data, 'base64');
      const storageProvider = new LocalStorageProvider();
      const cleanFolder = folder ? folder.replace(/[^a-zA-Z0-9_\-/]/g, '') : 'general';
      const key = `${activeWs}/${cleanFolder}/${Date.now()}_${filename}`;

      const uploadResult = await storageProvider.uploadBuffer(buffer, key, mimeType, filename);

      res.json({
        success: true,
        data: { upload: uploadResult }
      });
    } catch (err) {
      next(err);
    }
  }
);
