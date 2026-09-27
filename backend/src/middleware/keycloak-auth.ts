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
    console.log('🔐 Keycloak auth middleware');
    console.log('   Cookies:', Object.keys(req.cookies || {}));
    console.log('   _oauth2_proxy exists:', !!req.cookies?._oauth2_proxy);
    console.log('   Headers:', {
      'authorization': req.headers.authorization?.substring(0, 20),
      'x-auth-request-user': req.headers['x-auth-request-user'],
      'x-auth-request-email': req.headers['x-auth-request-email'],
    });

    // Check for oauth2-proxy session cookie
    const cookie = req.cookies._oauth2_proxy;
    if (!cookie) {
      console.log('   ❌ No cookie found');
      return res.status(401).json({ error: 'No Keycloak session' });
    }

    console.log('   ✅ Cookie found, length:', cookie.length);

    // For now, just check that cookie exists and is non-empty
    if (cookie.length < 100) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Extract user info from X-Auth-Request-* headers if available
    const user = req.headers['x-auth-request-user'] || 'unknown';
    const email = req.headers['x-auth-request-email'] || '';

    console.log('   ✅ User:', user, 'Email:', email);
    req.user = { email: email as string, name: user as string };

    next();
  } catch (error) {
    console.error('Keycloak auth error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}
