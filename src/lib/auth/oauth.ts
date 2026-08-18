/**
 * OAuth utility functions for copilot-cockpit.
 * Client-side helper functions for initiating and completing the GitHub OAuth web flow.
 */

export const OAUTH_STATE_KEY = 'cockpit-oauth-state';

/**
 * Creates and stores a random OAuth state value for CSRF protection.
 */
export function createOAuthState(): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  return state;
}

/**
 * Validates and clears the stored OAuth state.
 */
export function validateOAuthState(state: string | null): boolean {
  if (!state) return false;
  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  return stored === state;
}

/**
 * Builds the GitHub OAuth authorization URL.
 */
export function getAuthorizeUrl(
  clientId: string,
  redirectUri?: string,
  state?: string
): string {
  if (!clientId) {
    throw new Error('GitHub Client ID is required to build authorize URL');
  }
  const scope = 'repo,read:org,user';
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state ?? createOAuthState());
  if (redirectUri) {
    url.searchParams.set('redirect_uri', redirectUri);
  }
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

function parseTokenResponse(body: string): TokenResponse {
  try {
    return JSON.parse(body) as TokenResponse;
  } catch {
    return {};
  }
}

/**
 * Exchanges an authorization code for an access token by calling the auth-only serverless function.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!code) {
    throw new Error('Authorization code is required');
  }

  const response = await fetch('/api/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  const body = await response.text();
  const data = parseTokenResponse(body);

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.error ||
        `Failed to exchange code: ${response.status} ${body}`
    );
  }

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  if (!data.access_token) {
    throw new Error('No access token returned from server');
  }

  return data.access_token;
}
