export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface UserWithPasswordHash extends User {
    passwordHash: string;
}
export interface Session {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
}
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export interface Workspace {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface WorkspaceMember {
    id: string;
    workspaceId: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: Date;
    user?: {
        id: string;
        email: string;
        name: string;
    };
}
export interface WorkspaceWithMembers extends Workspace {
    members: WorkspaceMember[];
    userRole?: WorkspaceRole;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string;
    };
    meta?: {
        requestId: string;
        timestamp: string;
        [key: string]: unknown;
    };
}
export interface ServiceHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs?: number;
    message?: string;
}
export interface HealthCheckResponse {
    status: 'ok' | 'error';
    timestamp: string;
    uptimeSeconds: number;
    services: {
        api: ServiceHealth;
        postgres: ServiceHealth;
        redis: ServiceHealth;
    };
    environment: string;
    version: string;
}
export interface TestJobPayload {
    id: string;
    message: string;
    timestamp: number;
    triggeredBy?: string;
}
export interface TestJobResult {
    jobId: string;
    processedAt: string;
    status: 'completed' | 'failed';
    output: string;
}
export interface AIProviderConfig {
    apiKey: string;
    modelName?: string;
    temperature?: number;
}
export interface AIGenerationOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemInstruction?: string;
    timeoutMs?: number;
}
export interface AITextResponse {
    text: string;
    finishReason?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export interface AIProvider {
    readonly providerName: string;
    generateText(prompt: string, options?: AIGenerationOptions): Promise<AITextResponse>;
    generateStructured<T>(prompt: string, schema: unknown, options?: AIGenerationOptions): Promise<T>;
}
export interface MediaSearchQuery {
    query: string;
    orientation?: 'landscape' | 'portrait' | 'square';
    perPage?: number;
    page?: number;
}
export interface MediaAsset {
    id: string;
    provider: string;
    type: 'video' | 'image';
    title?: string;
    url: string;
    previewUrl: string;
    width: number;
    height: number;
    durationSeconds?: number;
    photographer?: string;
    photographerUrl?: string;
}
export interface MediaSearchResult {
    assets: MediaAsset[];
    totalResults: number;
    page: number;
    perPage: number;
}
export interface MediaProvider {
    readonly providerName: string;
    searchVideos(params: MediaSearchQuery): Promise<MediaSearchResult>;
    searchImages(params: MediaSearchQuery): Promise<MediaSearchResult>;
    getAssetById(id: string): Promise<MediaAsset | null>;
}
export interface RenderTimelineScene {
    id: string;
    durationMs: number;
    mediaAssetUrl?: string;
    captionText?: string;
    visualEffects?: Record<string, unknown>;
}
export interface RenderTimelineSpec {
    resolution: {
        width: number;
        height: number;
    };
    fps: number;
    totalDurationMs: number;
    scenes: RenderTimelineScene[];
    audioTrackUrl?: string;
}
export interface RenderJobStatus {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progressPercentage: number;
    outputVideoUrl?: string;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
}
export interface VideoRenderer {
    readonly rendererName: string;
    submitRenderJob(spec: RenderTimelineSpec): Promise<{
        jobId: string;
    }>;
    getRenderJobStatus(jobId: string): Promise<RenderJobStatus>;
    cancelRenderJob(jobId: string): Promise<boolean>;
}
//# sourceMappingURL=index.d.ts.map