import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      '@vidsnapai/types': path.resolve(__dirname, './packages/types/src/index.ts'),
      '@vidsnapai/validation': path.resolve(__dirname, './packages/validation/src/index.ts'),
      '@vidsnapai/config': path.resolve(__dirname, './packages/config/src/index.ts'),
      '@vidsnapai/database/schema': path.resolve(__dirname, './packages/database/src/schema/index.ts'),
      '@vidsnapai/database': path.resolve(__dirname, './packages/database/src/index.ts'),
      '@vidsnapai/ai': path.resolve(__dirname, './packages/ai/src/index.ts'),
      '@vidsnapai/media': path.resolve(__dirname, './packages/media/src/index.ts'),
      '@vidsnapai/video': path.resolve(__dirname, './packages/video/src/index.ts'),
      '@vidsnapai/brand': path.resolve(__dirname, './packages/brand/src/index.ts'),
      '@vidsnapai/campaign': path.resolve(__dirname, './packages/campaign/src/index.ts'),
      '@vidsnapai/content': path.resolve(__dirname, './packages/content/src/index.ts'),
      '@vidsnapai/voice': path.resolve(__dirname, './packages/voice/src/index.ts'),
      '@vidsnapai/captions': path.resolve(__dirname, './packages/captions/src/index.ts'),
      '@vidsnapai/animation': path.resolve(__dirname, './packages/animation/src/index.ts'),
      '@vidsnapai/audio': path.resolve(__dirname, './packages/audio/src/index.ts'),
      '@vidsnapai/storage': path.resolve(__dirname, './packages/storage/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60000,
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
