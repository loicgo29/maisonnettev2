/**
 * Authentification des routes d'administration via Cloudflare Access.
 *
 * Cloudflare vérifie l'identité avant que la requête n'atteigne le Mac Mini,
 * puis injecte un JWT signé dans l'en-tête `Cf-Access-Jwt-Assertion`. Ce
 * middleware le valide, en défense en profondeur : si quelqu'un atteignait le
 * conteneur sans passer par Cloudflare, l'en-tête serait absent ou invalide.
 *
 * Ce mécanisme remplace la dépendance au Keycloak de l'écosystème privé : le
 * site public n'est plus couplé à un service tiers pour fonctionner.
 *
 * Configuration (.env) :
 *   CF_ACCESS_TEAM_DOMAIN  ex. monequipe.cloudflareaccess.com
 *   CF_ACCESS_AUD          « Application Audience (AUD) Tag » de l'application
 *
 * En l'absence de configuration, l'accès est REFUSÉ. Une route d'administration
 * ne doit jamais s'ouvrir par accident sur une variable oubliée.
 */
import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';

interface AuthRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

const TEAM_DOMAIN = process.env.CF_ACCESS_TEAM_DOMAIN;
const AUD = process.env.CF_ACCESS_AUD;

let cachedJWKSet: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKSet() {
  if (!cachedJWKSet) {
    const url = `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`;
    console.log(`[Access] Clés de vérification : ${url}`);
    cachedJWKSet = createRemoteJWKSet(new URL(url));
  }
  return cachedJWKSet;
}

export async function verifierAccesAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!TEAM_DOMAIN || !AUD) {
    console.error(
      "[Access] CF_ACCESS_TEAM_DOMAIN ou CF_ACCESS_AUD manquant : accès refusé."
    );
    return res.status(503).json({ error: "Administration non configurée" });
  }

  const token =
    (req.headers['cf-access-jwt-assertion'] as string | undefined) ||
    req.cookies?.CF_Authorization;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  try {
    const { payload } = await jwtVerify(token, getJWKSet(), {
      issuer: `https://${TEAM_DOMAIN}`,
      audience: AUD,
    });

    req.user = payload as AuthRequest['user'];
    return next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Access] Jeton rejeté : ${message}`);
    return res.status(401).json({ error: 'Jeton invalide' });
  }
}

export { AuthRequest };
