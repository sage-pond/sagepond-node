import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SagepondClient } from '../src/client';

describe('SagepondClient API Key', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use apiKey from options if provided', () => {
    const client = new SagepondClient({ apiKey: 'provided-key' });
    expect((client as any).apiKey).toBe('provided-key');
  });

  it('should use SP_KEY from environment if apiKey not provided in options', () => {
    process.env.SP_KEY = 'env-key';
    const client = new SagepondClient();
    expect((client as any).apiKey).toBe('env-key');
  });

  it('should throw error if no API key is provided and SP_KEY is not set', () => {
    delete process.env.SP_KEY;
    expect(() => new SagepondClient()).toThrow(/API key must be provided/);
  });

  it('should prefer options.apiKey over SP_KEY', () => {
    process.env.SP_KEY = 'env-key';
    const client = new SagepondClient({ apiKey: 'provided-key' });
    expect((client as any).apiKey).toBe('provided-key');
  });
});
