/**
 * OAuth utility functions for copilot-cockpit.
 * Client-side helper functions for initiating and completing the GitHub OAuth web flow.
 */

/**
 * Builds the GitHub OAuth authorization URL.
 */
export function getAuthorizeUrl(clientId: string, redirectUri?: string): string {
  if (!clientId) {
    throw new Error('GitHub Client ID is required to build authorize URL');
  }
  const scope = 'repo,read:org,user';
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', scope);
  if (redirectUri) {
    url.searchParams.set('redirect_uri', redirectUri);
  }
  return url.toString();
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

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  if (!data.access_token) {
    throw new Error('No access token returned from server');
  }

  return data.access_token;
}
