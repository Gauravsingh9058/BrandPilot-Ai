import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  CreateBrandSchema,
  UpdateBrandSchema,
  CreateProductSchema,
  UpdateProductSchema,
  CreateBrandAssetSchema,
  AssignAssetToProductSchema,
  UpdateBrandDNASchema
} from '@vidsnapai/validation';
import { getDatabase, WorkspaceRepository } from '@vidsnapai/database';
import { createAIProvider } from '@vidsnapai/ai';
import { createStorageProvider } from '@vidsnapai/storage';
import { BrandService } from '@vidsnapai/brand';
import { getConfig } from '@vidsnapai/config';
import { requireAuth } from '../middleware/auth.js';
import { requireBrandAccess } from '../middleware/brand-access.js';
import { AppError } from '../middleware/error-handler.js';
import type { ApiResponse } from '@vidsnapai/types';

export const brandRouter: Router = Router();

const config = getConfig();
const db = getDatabase();
const aiProvider = createAIProvider({ apiKey: config.GEMINI_API_KEY });
const storageProvider = createStorageProvider();
const brandService = new BrandService(db, aiProvider, { storageProvider });
const workspaceRepo = new WorkspaceRepository(db);

// Helper to resolve the active workspace ID for requests without brandId
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

  const workspaces = await workspaceRepo.listForUser(req.user!.id);
  if (!workspaces || workspaces.length === 0) {
    throw new AppError('No accessible workspace found for user', 400, 'NO_WORKSPACE');
  }
  return workspaces[0].id;
}

// All brand routes require an authenticated user
brandRouter.use(requireAuth);

// ==========================================
// Brand Endpoints
// ==========================================

// POST /api/brands - Create a new brand in active workspace
brandRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await resolveActiveWorkspaceId(req);
    const validatedInput = CreateBrandSchema.parse(req.body);
    const brand = await brandService.createBrand(workspaceId, validatedInput);

    const response: ApiResponse = {
      success: true,
      data: { brand },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/brands - List brands for active workspace
brandRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = await resolveActiveWorkspaceId(req);
    const brands = await brandService.listBrands(workspaceId);

    const response: ApiResponse = {
      success: true,
      data: { brands },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/brands/:brandId - Get brand details with products, assets, and DNA
brandRouter.get('/:brandId', requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brandWithDetails = await brandService.getBrandById(req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: { brand: brandWithDetails },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/brands/:brandId - Update brand metadata (Admins and Owners)
brandRouter.patch('/:brandId', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = UpdateBrandSchema.parse(req.body);
    const updated = await brandService.updateBrand(req.brand!.id, req.activeWorkspaceId!, validatedInput);

    const response: ApiResponse = {
      success: true,
      data: { brand: updated },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/brands/:brandId - Delete brand (Admins and Owners)
brandRouter.delete('/:brandId', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await brandService.deleteBrand(req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: { message: 'Brand deleted successfully' },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Product Endpoints
// ==========================================

// POST /api/brands/:brandId/products - Add product
brandRouter.post('/:brandId/products', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = CreateProductSchema.parse(req.body);
    const product = await brandService.createProduct(req.brand!.id, req.activeWorkspaceId!, validatedInput);

    const response: ApiResponse = {
      success: true,
      data: { product },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/brands/:brandId/products - List products
brandRouter.get('/:brandId/products', requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await brandService.listProducts(req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: { products },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/brands/:brandId/products/:productId - Get product
brandRouter.get('/:brandId/products/:productId', requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    const product = await brandService.getProductById(productId, req.brand!.id, req.activeWorkspaceId!);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { product },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/brands/:brandId/products/:productId - Update product
brandRouter.patch('/:brandId/products/:productId', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    const validatedInput = UpdateProductSchema.parse(req.body);
    const updated = await brandService.updateProduct(productId, req.brand!.id, req.activeWorkspaceId!, validatedInput);

    if (!updated) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: { product: updated },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/brands/:brandId/products/:productId/assets - List assets bound to product
brandRouter.get('/:brandId/products/:productId/assets', requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    const assets = await brandService.listAssetsForProduct(productId, req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: { assets },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/brands/:brandId/products/:productId - Delete product
brandRouter.delete('/:brandId/products/:productId', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    const success = await brandService.deleteProduct(productId, req.brand!.id, req.activeWorkspaceId!);

    if (!success) {
      throw new AppError('Product not found or delete failed', 404, 'DELETE_FAILED');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Product deleted successfully' },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Brand DNA Endpoints
// ==========================================

// GET /api/brands/:brandId/dna - Get current latest Brand DNA
brandRouter.get('/:brandId/dna', requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dna = await brandService.getLatestBrandDNA(req.brand!.id, req.activeWorkspaceId!);
    const history = await brandService.getBrandDNAHistory(req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: {
        dna,
        history,
        status: dna ? 'READY' : 'NOT_GENERATED'
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/brands/:brandId/dna/generate - Generate or Regenerate Brand DNA with AI
brandRouter.post('/:brandId/dna/generate', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dna = await brandService.generateBrandDNA(req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Brand Brain DNA (Version ${dna.version}) generated successfully`,
        dna
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/brands/:brandId/dna - Manually edit latest Brand DNA
brandRouter.patch('/:brandId/dna', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = UpdateBrandDNASchema.parse(req.body);
    const updated = await brandService.updateBrandDNA(req.brand!.id, req.activeWorkspaceId!, validatedInput);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Brand DNA updated successfully',
        dna: updated
      },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// Asset Endpoints
// ==========================================

// POST /api/brands/:brandId/assets - Register brand asset
brandRouter.post('/:brandId/assets', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedInput = CreateBrandAssetSchema.parse(req.body);
    const asset = await brandService.createAsset(req.brand!.id, req.activeWorkspaceId!, validatedInput);

    const response: ApiResponse = {
      success: true,
      data: { asset },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/brands/:brandId/assets - List brand assets
brandRouter.get('/:brandId/assets', requireBrandAccess(['OWNER', 'ADMIN', 'MEMBER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assets = await brandService.listAssets(req.brand!.id, req.activeWorkspaceId!);

    const response: ApiResponse = {
      success: true,
      data: { assets },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/brands/:brandId/assets/:assetId/assign - Assign asset to product
brandRouter.patch('/:brandId/assets/:assetId/assign', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = Array.isArray(req.params.assetId) ? req.params.assetId[0] : req.params.assetId;
    const validatedInput = AssignAssetToProductSchema.parse(req.body);
    const updatedAsset = await brandService.assignAssetToProduct(
      assetId,
      req.brand!.id,
      req.activeWorkspaceId!,
      validatedInput
    );

    const response: ApiResponse = {
      success: true,
      data: { asset: updatedAsset },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/brands/:brandId/assets/:assetId - Delete brand asset
brandRouter.delete('/:brandId/assets/:assetId', requireBrandAccess(['OWNER', 'ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assetId = Array.isArray(req.params.assetId) ? req.params.assetId[0] : req.params.assetId;
    const force = req.query.force === 'true';
    const result = await brandService.deleteAsset(assetId, req.brand!.id, req.activeWorkspaceId!, { force });

    if (!result.success) {
      if (result.code === 'ASSET_NOT_FOUND' || result.code === 'BRAND_NOT_FOUND') {
        throw new AppError(result.error || 'Asset not found', 404, result.code);
      }
      if (result.code === 'ASSET_IN_USE') {
        throw new AppError(result.error || 'Asset is currently in use', 409, result.code);
      }
      throw new AppError(result.error || 'Delete failed', 400, 'DELETE_FAILED');
    }

    const response: ApiResponse = {
      success: true,
      data: { message: 'Asset deleted successfully' },
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});
