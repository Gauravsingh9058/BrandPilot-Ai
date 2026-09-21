import { describe, it, expect } from 'vitest';
import { NullVideoRenderer } from '../src/index.js';

describe('Video Renderer Package', () => {
  it('instantiates NullVideoRenderer with contract compliance', () => {
    const renderer = new NullVideoRenderer();
    expect(renderer.rendererName).toBe('null-renderer');
  });

  it('reports that video rendering is scheduled for Phase 8 without fake rendering', async () => {
    const renderer = new NullVideoRenderer();
    await expect(
      renderer.submitRenderJob({
        resolution: { width: 1080, height: 1920 },
        fps: 30,
        totalDurationMs: 5000,
        scenes: []
      })
    ).rejects.toThrow('Phase 8');
  });
});
