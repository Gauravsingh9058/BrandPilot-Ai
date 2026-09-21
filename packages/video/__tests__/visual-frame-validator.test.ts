import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { VisualFrameValidator } from '../src/visualFrameValidator.js';

describe('VisualFrameValidator', () => {
  let tempDir: string;
  let solidBlueMp4: string;
  let videoWithTextMp4: string;

  const runFfmpeg = (args: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      ff.stderr.on('data', (d) => (err += d.toString()));
      ff.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg error (code ${code}): ${err}`));
      });
      ff.on('error', reject);
    });
  };

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vidsnapai_validator_test_'));
    solidBlueMp4 = path.join(tempDir, 'solid_blue.mp4');
    videoWithTextMp4 = path.join(tempDir, 'with_text.mp4');

    // 1. Create a 3-second solid blue video (#3B82F6)
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'color=c=0x3B82F6:s=1080x1920:d=3:r=30',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y',
      solidBlueMp4
    ]);

    // 2. Create a 3-second video with text overlays, contrast box, and visual elements
    await runFfmpeg([
      '-f', 'lavfi',
      '-i', 'color=c=0x1E293B:s=1080x1920:d=3:r=30',
      '-vf', "drawtext=text='ONE8 ACTIVE':fontsize=72:fontcolor=white:box=1:boxcolor=0xFF4500@0.9:boxborderw=24:x=(w-text_w)/2:y=(h-text_h)/2,drawbox=x=100:y=200:w=880:h=400:color=0x3B82F6@0.7:t=fill",
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-y',
      videoWithTextMp4
    ]);
  }, 45000);

  afterAll(async () => {
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup error
    }
  });

  it('rejects a uniform solid blue MP4 and flags REEL_RENDER_VALIDATION_FAILED', async () => {
    const result = await VisualFrameValidator.validateVideo(solidBlueMp4, {
      durationSeconds: 3
    });

    expect(result.valid).toBe(false);
    expect(result.visualContentDetected).toBe(false);
    expect(result.solidFramesCount).toBe(result.samplePointsCount);
    expect(result.averageStdDev).toBeLessThan(1.0);
    expect(result.failureCode).toBe('REEL_RENDER_VALIDATION_FAILED');
    expect(result.failureReason).toContain('uniform frames');
  }, 25000);

  it('accepts a video with real visual content and text overlays', async () => {
    const frameOutputDir = path.join(tempDir, 'frames');
    const result = await VisualFrameValidator.validateVideo(videoWithTextMp4, {
      durationSeconds: 3,
      saveSampleImagesToDir: frameOutputDir
    });

    expect(result.valid).toBe(true);
    expect(result.visualContentDetected).toBe(true);
    expect(result.solidFramesCount).toBe(0);
    expect(result.averageStdDev).toBeGreaterThan(5.0);
    expect(result.averageUniqueColors).toBeGreaterThan(10);
    expect(fs.existsSync(frameOutputDir)).toBe(true);
  }, 25000);
});
