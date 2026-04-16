import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SagepondClient } from '../src/client';
import axios from 'axios';

vi.mock('axios', async () => {
  const actual = await vi.importActual('axios') as any;
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        post: vi.fn(),
        defaults: { headers: {} }
      })),
      isAxiosError: actual.isAxiosError,
    },
  };
});

describe('SagepondClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, SP_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Configuration & Validation', () => {
    it('should use SP_KEY from environment', () => {
      const client = new SagepondClient();
      expect((client as any).apiKey).toBe('test-key');
    });

    it('should throw error if baseUrl is invalid', () => {
      expect(() => new SagepondClient({ baseUrl: 'not-a-url' })).toThrow();
    });

    it('should throw error if no API key is found', () => {
      delete process.env.SP_KEY;
      expect(() => new SagepondClient()).toThrow(/API key must be provided/);
    });
  });

  describe('Namespacing', () => {
    it('should have a models.list method', () => {
      const client = new SagepondClient();
      expect(client.models.list).toBeDefined();
      expect(typeof client.models.list).toBe('function');
    });
  });

  describe('Streaming Logic', () => {
    it('should include stream: true in the body when requested', async () => {
      const client = new SagepondClient();
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      (client as any).client.post = mockPost;

      await client.send('test', 'hello', { stream: true });

      expect(mockPost).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ stream: true, text: 'hello' }),
        expect.objectContaining({ responseType: 'stream' })
      );
    });

    it('should include stream: false in the body by default', async () => {
      const client = new SagepondClient();
      const mockPost = vi.fn().mockResolvedValue({ data: {} });
      (client as any).client.post = mockPost;

      await client.send('test', 'hello');

      expect(mockPost).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({ stream: false, text: 'hello' }),
        expect.objectContaining({ responseType: 'json' })
      );
    });
  });
});
