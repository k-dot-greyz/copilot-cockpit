/**
 * @stub MOD-OAUTH-SERVERLESS — PR #8
 * Serverless token exchange — never bundle client secret
 */
export async function exchangeOAuthCode(_code: string): Promise<{ access_token: string }> {
  throw new Error('[STUB] MOD-OAUTH-SERVERLESS: implement api/auth/token.ts from PR #8');
}
