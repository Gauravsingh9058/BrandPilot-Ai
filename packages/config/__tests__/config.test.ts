import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/index.js';

describe('Config Package', () => {
  it('loads valid environment overrides', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vidsnapai_test',
      REDIS_URL: 'redis://localhost:6379',
      SESSION_SECRET: 'test_session_secret_key_minimum_32_chars_long'
    });

    expect(config.NODE_ENV).toBe('test');
    expect(config.DATABASE_URL).toBe('postgresql://postgres:postgres@localhost:5432/vidsnapai_test');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('throws descriptive error on missing database url', () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: '',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: 'test_session_secret_key_minimum_32_chars_long'
      })
    ).toThrow('[Config Error]');
  });
});
