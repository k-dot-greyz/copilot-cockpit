import type { VercelRequest, VercelResponse } from '@vercel/node';

function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applyCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers?.origin;
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    return;
  }

  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Requested-With'
    );
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Missing code parameter' });
    return;
  }

  const client_id = process.env.PUBLIC_GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    res.status(500).json({ error: 'OAuth configuration missing on server' });
    return;
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) {
      res.status(400).json({ error: data.error_description || data.error });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  }
}
