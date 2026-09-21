import dotenv from 'dotenv';
import path from 'path';
import { EnvSchema, type EnvConfig } from '@vidsnapai/validation';

// Load .env from root or current directory if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

let validatedConfig: EnvConfig | null = null;

export function loadConfig(envOverrides?: Partial<Record<string, string>>): EnvConfig {
  const rawEnv = {
    ...process.env,
    ...envOverrides
  };

  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const formattedErrors = parsed.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `[Config Error] Invalid environment configuration:\n${formattedErrors}\n` +
      `Please check your .env file or environment variables.`
    );
  }

  validatedConfig = parsed.data;
  return validatedConfig;
}

export function getConfig(): EnvConfig {
  if (!validatedConfig) {
    return loadConfig();
  }
  return validatedConfig;
}
