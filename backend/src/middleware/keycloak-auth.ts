import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate Keycloak session cookie
 * Checks if user has a valid oauth2-proxy session
 */
export async function requireKeycloakAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Check for oauth2-proxy session cookie
    const cookie = req.cookies._oauth2_proxy;
    if (!cookie) {
      return res.status(401).json({ error: 'No Keycloak session' });
    }

    // For now, just check that cookie exists and is non-empty
    // In production, you could validate the cookie signature
    if (cookie.length < 100) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Extract user info from X-Auth-Request-* headers if available
    // These are set by oauth2-proxy when validating the session
    const user = req.headers['x-auth-request-user'] || 'unknown';
    const email = req.headers['x-auth-request-email'] || '';

    // Attach to request for use in controllers
    req.user = { email: email as string, name: user as string };

    next();
  } catch (error) {
    console.error('Keycloak auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
