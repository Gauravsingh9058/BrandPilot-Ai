import type { Database } from '@vidsnapai/database';
import type {
  ContentPlan,
  ContentJob,
  ContentPlanWithJobs,
  CreateContentPlanInput,
  UpdateContentPlanInput,
  UpdateContentJobInput,
  ContentJobStatus
} from '@vidsnapai/types';
import { BrandRepository } from '@vidsnapai/brand';
import { ContentPlanRepository } from './repositories/content-plan.repository.js';
import { ContentJobRepository } from './repositories/content-job.repository.js';

export class ContentPlanService {
  private planRepo: ContentPlanRepository;
  private jobRepo: ContentJobRepository;
  private brandRepo: BrandRepository;

  constructor(
    db: Database,
    repos?: {
      planRepo?: ContentPlanRepository;
      jobRepo?: ContentJobRepository;
      brandRepo?: BrandRepository;
    }
  ) {
    this.planRepo = repos?.planRepo ?? new ContentPlanRepository(db);
    this.jobRepo = repos?.jobRepo ?? new ContentJobRepository(db);
    this.brandRepo = repos?.brandRepo ?? new BrandRepository(db);
  }

  // ==========================================
  // Plan Operations
  // ==========================================

  async createPlan(
    brandId: string,
    workspaceId: string,
    input: CreateContentPlanInput
  ): Promise<ContentPlan> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    return this.planRepo.create(brandId, workspaceId, input);
  }

  async listPlans(
    brandId: string,
    workspaceId: string,
    campaignId?: string
  ): Promise<ContentPlan[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    return this.planRepo.listForBrand(brandId, campaignId);
  }

  async getPlanById(
    planId: string,
    brandId: string,
    workspaceId: string
  ): Promise<ContentPlan | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;

    return this.planRepo.findByIdAndBrand(planId, brandId);
  }

  async getPlanWithJobs(
    planId: string,
    brandId: string,
    workspaceId: string
  ): Promise<ContentPlanWithJobs | null> {
    const plan = await this.getPlanById(planId, brandId, workspaceId);
    if (!plan) return null;

    const jobs = await this.jobRepo.listForPlan(planId);
    return {
      ...plan,
      jobs
    };
  }

  async updatePlan(
    planId: string,
    brandId: string,
    workspaceId: string,
    input: UpdateContentPlanInput
  ): Promise<ContentPlan | null> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return null;

    return this.planRepo.update(planId, brandId, input);
  }

  async deletePlan(
    planId: string,
    brandId: string,
    workspaceId: string
  ): Promise<boolean> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) return false;

    return this.planRepo.delete(planId, brandId);
  }

  async getPlanVersions(
    planGroupId: string,
    brandId: string,
    workspaceId: string
  ): Promise<ContentPlan[]> {
    const brand = await this.brandRepo.findByIdAndWorkspace(brandId, workspaceId);
    if (!brand) {
      throw new Error(`Brand with ID "${brandId}" not found in this workspace`);
    }

    return this.planRepo.findVersions(planGroupId, brandId);
  }

  // ==========================================
  // Content Job Operations
  // ==========================================

  async listJobs(
    planId: string,
    brandId: string,
    workspaceId: string,
    filter?: {
      status?: ContentJobStatus;
      contentType?: any;
      format?: any;
      funnelStage?: any;
    }
  ): Promise<ContentJob[]> {
    const plan = await this.getPlanById(planId, brandId, workspaceId);
    if (!plan) {
      throw new Error(`Content Plan with ID "${planId}" not found`);
    }

    return this.jobRepo.listForPlan(planId, filter);
  }

  async getJobById(
    jobId: string,
    planId: string,
    brandId: string,
    workspaceId: string
  ): Promise<ContentJob | null> {
    const plan = await this.getPlanById(planId, brandId, workspaceId);
    if (!plan) return null;

    return this.jobRepo.findByIdAndPlan(jobId, planId);
  }

  async updateJob(
    jobId: string,
    planId: string,
    brandId: string,
    workspaceId: string,
    input: UpdateContentJobInput
  ): Promise<ContentJob | null> {
    const plan = await this.getPlanById(planId, brandId, workspaceId);
    if (!plan) {
      throw new Error(`Content Plan with ID "${planId}" not found`);
    }

    return this.jobRepo.update(jobId, planId, input);
  }

  async updateJobStatus(
    jobId: string,
    planId: string,
    brandId: string,
    workspaceId: string,
    status: ContentJobStatus
  ): Promise<ContentJob | null> {
    const plan = await this.getPlanById(planId, brandId, workspaceId);
    if (!plan) {
      throw new Error(`Content Plan with ID "${planId}" not found`);
    }

    return this.jobRepo.updateStatus(jobId, planId, status);
  }

  async deleteJob(
    jobId: string,
    planId: string,
    brandId: string,
    workspaceId: string
  ): Promise<boolean> {
    const plan = await this.getPlanById(planId, brandId, workspaceId);
    if (!plan) return false;

    return this.jobRepo.delete(jobId, planId);
  }
}
