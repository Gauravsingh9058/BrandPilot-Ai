import type { ApiResponse } from '@vidsnapai/types';

export class ApiError extends Error {
  constructor(
    public message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let currentActiveWorkspaceId: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('vidsnapai_active_workspace_id') : null;

export function getActiveWorkspaceId(): string | null {
  if (typeof window !== 'undefined') {
    return currentActiveWorkspaceId || localStorage.getItem('vidsnapai_active_workspace_id');
  }
  return currentActiveWorkspaceId;
}

export function setActiveWorkspaceId(workspaceId: string | null): void {
  currentActiveWorkspaceId = workspaceId;
  if (typeof window !== 'undefined') {
    if (workspaceId) {
      localStorage.setItem('vidsnapai_active_workspace_id', workspaceId);
    } else {
      localStorage.removeItem('vidsnapai_active_workspace_id');
    }
  }
}

/**
 * Normalizes an API endpoint path or URL, ensuring:
 * 1. Absolute URLs (http/https) are preserved untouched.
 * 2. Duplicate `/api/api` prefixes are collapsed to `/api`.
 * 3. Endpoints without `/api` prefix are automatically prefixed with `/api`.
 * 4. Endpoints already starting with `/api` are NOT doubly prefixed.
 * 5. Optional VITE_API_URL base origin is prepended when provided.
 */
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint.replace(/\/api\/api\b/g, '/api');
  }

  // Ensure leading slash
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Collapses any accidental duplicate /api/api
  while (path.startsWith('/api/api/') || path === '/api/api') {
    path = path.replace(/^\/api\/api/, '/api');
  }

  // Ensure path starts with /api
  if (!path.startsWith('/api/') && path !== '/api') {
    path = `/api${path}`;
  }

  const metaEnv = (import.meta as unknown as { env?: Record<string, string> })?.env;
  let baseOrigin = (metaEnv?.VITE_API_URL || '').replace(/\/+$/, '');
  if (baseOrigin.endsWith('/api')) {
    baseOrigin = baseOrigin.slice(0, -4);
  }
  const fullUrl = baseOrigin ? `${baseOrigin}${path}` : path;
  return fullUrl.replace(/\/api\/api\b/g, '/api');
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  const activeWs = getActiveWorkspaceId();
  if (activeWs) {
    defaultHeaders['x-workspace-id'] = activeWs;
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string> || {})
    }
  });

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Failed to parse server response', 'PARSE_ERROR', response.status);
  }

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || response.statusText || 'An unexpected error occurred';
    const errorCode = data.error?.code || 'API_ERROR';
    throw new ApiError(errorMsg, errorCode, response.status, data.error?.details);
  }

  return (data.data !== undefined ? data.data : data) as T;
}
