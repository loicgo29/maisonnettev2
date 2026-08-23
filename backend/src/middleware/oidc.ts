import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';

interface AuthRequest extends Request {
  user?: {
    sub: string; // Subject (user ID from Authentik)
    email?: string;
    name?: string;
    [key: string]: any;
  };
}

const JWKS_URL = `${process.env.KEYCLOAK_REALM_URL}jwks/`;

let cachedJWKSet: ReturnType<typeof createRemoteJWKSet> | null = null;

async function getJWKSet() {
  if (!cachedJWKSet) {
    console.log(`[OIDC] Initializing JWKS from ${JWKS_URL}`);
    cachedJWKSet = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return cachedJWKSet;
}

export async function verifyOIDCToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);

    try {
      const jwkSet = await getJWKSet();
      const verified = await jwtVerify(token, jwkSet);

      // Attach decoded token payload to request
      req.user = verified.payload as any;
      return next();
    } catch (err) {
      if (err instanceof Error) {
        console.error(`[OIDC] Token verification failed: ${err.message}`);
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('[OIDC] Middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export { AuthRequest };
