import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import {
  getAuthorizeUrl,
  exchangeCodeForToken,
  createOAuthState,
  validateOAuthState,
  OAUTH_STATE_KEY,
} from './oauth';

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  sessionStorageMock.clear();
  vi.stubGlobal('sessionStorage', sessionStorageMock);
  vi.stubGlobal('crypto', {
    randomUUID: () => 'test-oauth-state-uuid',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAuthorizeUrl', () => {
  it('builds the correct GitHub OAuth URL with client_id and scope', () => {
    const url = getAuthorizeUrl('my-client-id', undefined, 'fixed-state');
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://github.com');
    expect(parsed.pathname).toBe('/login/oauth/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('my-client-id');
    expect(parsed.searchParams.get('scope')).toBe('repo,read:org,user');
    expect(parsed.searchParams.get('state')).toBe('fixed-state');
  });

  it('includes redirect_uri if provided', () => {
    const url = getAuthorizeUrl('my-client-id', 'https://my-app.com/callback', 'fixed-state');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://my-app.com/callback');
  });

  it('creates and stores state when not provided', () => {
    const url = getAuthorizeUrl('my-client-id');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('state')).toBe('test-oauth-state-uuid');
    expect(sessionStorage.getItem(OAUTH_STATE_KEY)).toBe('test-oauth-state-uuid');
  });

  it('throws an error if client_id is missing', () => {
    expect(() => getAuthorizeUrl('')).toThrow('GitHub Client ID is required');
  });
});

describe('validateOAuthState', () => {
  it('accepts matching state once and clears storage', () => {
    sessionStorage.setItem(OAUTH_STATE_KEY, 'abc123');
    expect(validateOAuthState('abc123')).toBe(true);
    expect(sessionStorage.getItem(OAUTH_STATE_KEY)).toBeNull();
  });

  it('rejects missing or mismatched state', () => {
    sessionStorage.setItem(OAUTH_STATE_KEY, 'abc123');
    expect(validateOAuthState('wrong')).toBe(false);
    expect(validateOAuthState(null)).toBe(false);
  });
});

describe('createOAuthState', () => {
  it('stores a generated state value', () => {
    const state = createOAuthState();
    expect(state).toBe('test-oauth-state-uuid');
    expect(sessionStorage.getItem(OAUTH_STATE_KEY)).toBe('test-oauth-state-uuid');
  });
});

describe('exchangeCodeForToken', () => {
  it('successfully exchanges code for token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ access_token: 'gho_secret_token_123' }),
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
        text: async () => JSON.stringify({ error: 'bad_verification_code' }),
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'bad_verification_code'
    );
  });

  it('throws an error if API returns OAuth error in a 200 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            error: 'bad_verification_code',
            error_description: 'The code passed is incorrect or expired.',
          }),
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'The code passed is incorrect or expired.'
    );
  });

  it('throws when server returns 200 but no access_token field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ token_type: 'bearer' }),
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'No access token returned from server'
    );
  });

  it('falls back to error field when error_description is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            error: 'bad_verification_code',
          }),
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'bad_verification_code'
    );
  });

  it('throws when server returns non-JSON body on error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'upstream gateway failure',
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'Failed to exchange code: 502 upstream gateway failure'
    );
  });

  it('throws when server returns malformed JSON body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'not-json{{{',
      })
    );

    await expect(exchangeCodeForToken('my-code')).rejects.toThrow(
      'No access token returned from server'
    );
  });

  it('sends POST request to /api/auth/token with the code', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'gho_test_token' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await exchangeCodeForToken('test-code-value');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ code: 'test-code-value' }),
      })
    );
  });
});

describe('getAuthorizeUrl — additional edge cases', () => {
  it('does not include redirect_uri when not provided', () => {
    const url = getAuthorizeUrl('some-client-id', undefined, 'fixed-state');
    const parsed = new URL(url);
    expect(parsed.searchParams.has('redirect_uri')).toBe(false);
  });

  it('always uses https://github.com/login/oauth/authorize as base', () => {
    const url = getAuthorizeUrl('client-id', 'https://myapp.com/callback', 'fixed-state');
    expect(url.startsWith('https://github.com/login/oauth/authorize')).toBe(true);
  });
});
