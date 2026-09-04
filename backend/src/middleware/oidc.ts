import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';

interface AuthRequest extends Request {
  user?: {
    sub: string; // Subject (user ID from Authentik)
    email?: string;
    name?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

// Keycloak publie ses clés sous <realm>/protocol/openid-connect/certs.
//
// KEYCLOAK_REALM_URL est fournie tantôt jusqu'au realm, tantôt jusqu'à
// protocol/openid-connect/ selon l'environnement : on normalise donc au realm
// avant d'ajouter le chemin, sinon l'une des deux formes produit un 404.
//
// Constaté en production le 2026-08-30 : une URL JWKS erronée ne casse rien au
// démarrage — le backend se lance et répond /health — mais aucune clé n'est
// jamais récupérée et TOUT jeton est rejeté en 401, y compris les valides,
// sans rien qui le distingue d'un vrai jeton invalide. D'où test-jwks.sh, qui
// transforme cette panne silencieuse en échec net.
const REALM_URL = (process.env.KEYCLOAK_REALM_URL ?? '')
  .replace(/\/+$/, '')
  .replace(/\/protocol\/openid-connect$/, '');

if (!REALM_URL) {
  throw new Error(
    'KEYCLOAK_REALM_URL est absente : aucun jeton ne pourrait être vérifié. ' +
      'Renseignez-la dans le compose de cet environnement.'
  );
}

const JWKS_URL = `${REALM_URL}/protocol/openid-connect/certs`;

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
    console.log(`[OIDC] Verifying token for ${req.method} ${req.path}`);

    if (!authHeader?.startsWith('Bearer ')) {
      console.warn('[OIDC] Missing or invalid authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    console.log(`[OIDC] Token received, length: ${token.length}`);

    try {
      const jwkSet = await getJWKSet();
      console.log('[OIDC] JWKS loaded, verifying token...');

      const verified = await jwtVerify(token, jwkSet);
      console.log('[OIDC] Token verified successfully:', { sub: verified.payload.sub });

      // Attach decoded token payload to request
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      req.user = verified.payload as any;
      return next();
    } catch (err) {
      if (err instanceof Error) {
        console.error(`[OIDC] Token verification failed: ${err.message}`);
        console.error(`[OIDC] Error details:`, err);
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (err) {
    console.error('[OIDC] Middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

export { AuthRequest };
