import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import handler from '../../api/auth/token';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.PUBLIC_GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
});

/**
 * Builds a minimal mock VercelRequest-like object.
 */
function makeReq(
  method: string,
  body: Record<string, unknown> = {}
): any {
  return { method, body };
}

/**
 * Builds a minimal mock VercelResponse-like object that records calls.
 */
function makeRes() {
  const headers: Record<string, string> = {};
  const res = {
    _status: 0,
    _body: undefined as unknown,
    _ended: false,
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value;
      return res;
    },
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
    end() {
      res._ended = true;
      return res;
    },
  };
  return res;
}

describe('api/auth/token handler', () => {
  describe('CORS headers', () => {
    it('sets CORS headers on every request', async () => {
      const req = makeReq('GET');
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
    });
  });

  describe('OPTIONS preflight', () => {
    it('responds 200 and ends for OPTIONS requests', async () => {
      const req = makeReq('OPTIONS');
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(200);
      expect(res._ended).toBe(true);
    });
  });

  describe('non-POST methods', () => {
    it('returns 405 for GET requests', async () => {
      const req = makeReq('GET');
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(405);
      expect(res._body).toEqual({ error: 'Method not allowed' });
    });

    it('returns 405 for PUT requests', async () => {
      const req = makeReq('PUT');
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(405);
    });

    it('returns 405 for DELETE requests', async () => {
      const req = makeReq('DELETE');
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(405);
    });
  });

  describe('POST — missing code parameter', () => {
    it('returns 400 when body has no code field', async () => {
      const req = makeReq('POST', {});
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'Missing code parameter' });
    });

    it('returns 400 when code is an empty string', async () => {
      const req = makeReq('POST', { code: '' });
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'Missing code parameter' });
    });
  });

  describe('POST — missing environment variables', () => {
    it('returns 500 when PUBLIC_GITHUB_CLIENT_ID is missing', async () => {
      process.env.GITHUB_CLIENT_SECRET = 'secret';
      const req = makeReq('POST', { code: 'abc' });
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: 'OAuth configuration missing on server' });
    });

    it('returns 500 when GITHUB_CLIENT_SECRET is missing', async () => {
      process.env.PUBLIC_GITHUB_CLIENT_ID = 'client-id';
      const req = makeReq('POST', { code: 'abc' });
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: 'OAuth configuration missing on server' });
    });

    it('returns 500 when both env vars are missing', async () => {
      const req = makeReq('POST', { code: 'abc' });
      const res = makeRes();
      await handler(req as any, res as any);
      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: 'OAuth configuration missing on server' });
    });
  });

  describe('POST — successful token exchange', () => {
    beforeEach(() => {
      process.env.PUBLIC_GITHUB_CLIENT_ID = 'my-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'my-client-secret';
    });

    it('calls GitHub OAuth endpoint and returns the token data', async () => {
      const tokenData = { access_token: 'gho_abc123', token_type: 'bearer', scope: 'repo' };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: async () => tokenData,
        })
      );

      const req = makeReq('POST', { code: 'valid-code' });
      const res = makeRes();
      await handler(req as any, res as any);

      expect(res._status).toBe(200);
      expect(res._body).toEqual(tokenData);
    });

    it('sends correct payload to GitHub OAuth endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: async () => ({ access_token: 'gho_test' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const req = makeReq('POST', { code: 'my-code' });
      const res = makeRes();
      await handler(req as any, res as any);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Accept: 'application/json',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            client_id: 'my-client-id',
            client_secret: 'my-client-secret',
            code: 'my-code',
          }),
        })
      );
    });
  });

  describe('POST — GitHub OAuth error response', () => {
    beforeEach(() => {
      process.env.PUBLIC_GITHUB_CLIENT_ID = 'my-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'my-client-secret';
    });

    it('returns 400 with error_description when GitHub returns an error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: async () => ({
            error: 'bad_verification_code',
            error_description: 'The code passed is incorrect or expired.',
          }),
        })
      );

      const req = makeReq('POST', { code: 'bad-code' });
      const res = makeRes();
      await handler(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'The code passed is incorrect or expired.' });
    });

    it('falls back to error field when error_description is absent', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          json: async () => ({
            error: 'bad_verification_code',
          }),
        })
      );

      const req = makeReq('POST', { code: 'bad-code' });
      const res = makeRes();
      await handler(req as any, res as any);

      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'bad_verification_code' });
    });
  });

  describe('POST — fetch throws', () => {
    beforeEach(() => {
      process.env.PUBLIC_GITHUB_CLIENT_ID = 'my-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'my-client-secret';
    });

    it('returns 500 with error message when fetch throws an Error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network failure'))
      );

      const req = makeReq('POST', { code: 'valid-code' });
      const res = makeRes();
      await handler(req as any, res as any);

      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: 'Network failure' });
    });

    it('returns 500 with generic message when fetch throws a non-Error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue('something went wrong')
      );

      const req = makeReq('POST', { code: 'valid-code' });
      const res = makeRes();
      await handler(req as any, res as any);

      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: 'Internal server error' });
    });
  });
});