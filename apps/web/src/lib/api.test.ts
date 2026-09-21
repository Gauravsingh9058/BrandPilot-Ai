import { describe, it, expect } from 'vitest';
import { buildApiUrl } from './api.js';

describe('buildApiUrl URL Normalizer', () => {
  it('preserves full absolute URLs', () => {
    expect(buildApiUrl('http://localhost:4000/api/brands')).toBe('http://localhost:4000/api/brands');
    expect(buildApiUrl('https://api.vidsnapai.com/api/brands')).toBe('https://api.vidsnapai.com/api/brands');
  });

  it('keeps single /api when endpoint already starts with /api', () => {
    expect(buildApiUrl('/api/brands')).toBe('/api/brands');
    expect(buildApiUrl('/api/brands/brand-123/marketing/strategy')).toBe('/api/brands/brand-123/marketing/strategy');
    expect(buildApiUrl('/api/auth/me')).toBe('/api/auth/me');
  });

  it('adds /api prefix when endpoint does not have it', () => {
    expect(buildApiUrl('/brands')).toBe('/api/brands');
    expect(buildApiUrl('brands')).toBe('/api/brands');
    expect(buildApiUrl('/brands/brand-123')).toBe('/api/brands/brand-123');
    expect(buildApiUrl('/workspaces')).toBe('/api/workspaces');
    expect(buildApiUrl('/health')).toBe('/api/health');
  });

  it('collapses duplicate /api/api to single /api', () => {
    expect(buildApiUrl('/api/api/brands')).toBe('/api/brands');
    expect(buildApiUrl('/api/api/brands/123/marketing/strategy')).toBe('/api/brands/123/marketing/strategy');
    expect(buildApiUrl('/api/api/api/brands')).toBe('/api/brands');
    expect(buildApiUrl('/api/api/reels')).toBe('/api/reels');
    expect(buildApiUrl('/api/api/content-plans')).toBe('/api/content-plans');
  });

  it('handles absolute URLs with duplicate /api/api', () => {
    expect(buildApiUrl('http://localhost:4000/api/api/brands')).toBe('http://localhost:4000/api/brands');
    expect(buildApiUrl('http://localhost:4000/api/api/reels')).toBe('http://localhost:4000/api/reels');
  });
});
