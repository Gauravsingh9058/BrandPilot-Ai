import { describe, it, expect } from 'vitest';
import {
  SignupSchema,
  LoginSchema,
  CreateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  EnvSchema
} from '../src/index.js';

describe('Validation Suite', () => {
  describe('SignupSchema', () => {
    it('accepts valid signup input', () => {
      const valid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Password123'
      };
      const result = SignupSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Pass1'
      };
      const result = SignupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid email formats', () => {
      const invalid = {
        name: 'Jane Doe',
        email: 'not-an-email',
        password: 'Password123'
      };
      const result = SignupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('LoginSchema', () => {
    it('accepts valid login input', () => {
      const valid = {
        email: 'jane@example.com',
        password: 'Password123'
      };
      expect(LoginSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty password', () => {
      const invalid = {
        email: 'jane@example.com',
        password: ''
      };
      expect(LoginSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('CreateWorkspaceSchema', () => {
    it('accepts valid workspace name', () => {
      expect(CreateWorkspaceSchema.safeParse({ name: 'Growth Marketing' }).success).toBe(true);
    });

    it('rejects workspace name with less than 2 characters', () => {
      expect(CreateWorkspaceSchema.safeParse({ name: 'A' }).success).toBe(false);
    });
  });

  describe('AddWorkspaceMemberSchema', () => {
    it('accepts valid member invite', () => {
      expect(
        AddWorkspaceMemberSchema.safeParse({
          email: 'teammate@company.com',
          role: 'ADMIN'
        }).success
      ).toBe(true);
    });

    it('rejects invalid roles like OWNER or GUEST in invite schema', () => {
      expect(
        AddWorkspaceMemberSchema.safeParse({
          email: 'teammate@company.com',
          role: 'SUPERADMIN' as unknown
        }).success
      ).toBe(false);
    });
  });

  describe('EnvSchema', () => {
    it('validates minimal required environment variables and defaults GEMINI_MODEL to gemini-3.6-flash', () => {
      const validEnv = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vidsnapai',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: '12345678901234567890123456789012'
      };
      const result = EnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.GEMINI_MODEL).toBe('gemini-3.6-flash');
      }
    });

    it('fails when SESSION_SECRET is too short (<32 chars)', () => {
      const invalidEnv = {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vidsnapai',
        REDIS_URL: 'redis://localhost:6379',
        SESSION_SECRET: 'short_secret'
      };
      const result = EnvSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });
  });
});
