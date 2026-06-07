import { describe, expect, it, vi, afterEach } from 'vitest';
import { getAuthorizeUrl, exchangeCodeForToken } from './oauth';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAuthorizeUrl', () => {
  it('builds the correct GitHub OAuth URL with client_id and scope', () => {
    const url = getAuthorizeUrl('my-client-id');
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://github.com');
    expect(parsed.pathname).toBe('/login/oauth/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('my-client-id');
    expect(parsed.searchParams.get('scope')).toBe('repo,read:org,user');
  });

  it('includes redirect_uri if provided', () => {
    const url = getAuthorizeUrl('my-client-id', 'https://my-app.com/callback');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://my-app.com/callback');
  });

  it('throws an error if client_id is missing', () => {
    expect(() => getAuthorizeUrl('')).toThrow('GitHub Client ID is required');
  });
});

describe('exchangeCodeForToken', () => {
  it('successfully exchanges code for token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'gho_secret_token_123' }),
      })
    );

    const token = await exchangeCodeForToken('my-code');
    expect(token).toBe('gho_secret_token_123');
  });

  it('throws an error if code is missing', async () => {
    await expect(exchangeCodeForToken('')).rejects.toThrow(
      'Authorization code is required'
    );
  });

  it('throws an error on API error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'Failed to exchange code: 400 Bad Request'
    );
  });

  it('throws an error if API returns OAuth error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired.',
        }),
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'The code passed is incorrect or expired.'
    );
  });
});
