import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// JWT_SECRET must be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET_VALUE = JWT_SECRET || 'development-key-insecure';
const JWT_EXPIRY = '24h';

// Zod schema for login request validation
const LoginSchema = z.object({
  username: z.string().min(1, 'Username required').max(100).trim(),
  pwd: z.string().min(4, 'Password must be at least 4 characters').max(256),
});

const DUREE_SESSION_MS = 24 * 60 * 60 * 1000;

/**
 * Options du cookie de session, partagées entre la pose et l'effacement.
 *
 * Les deux doivent coïncider exactement : un `clearCookie` dont le Domain
 * diffère n'efface rien, et la déconnexion ne déconnecte alors personne.
 */
function cookieSession(req: Request) {
  const hote = req.hostname;
  // La spécification n'autorise pas d'attacher un domaine à une adresse IP ;
  // le cookie serait rejeté en silence.
  const estAdresseIP = /^[\d.]+$/.test(hote) || hote.includes(':');

  return {
    httpOnly: true,
    // `req.secure` dépend de X-Forwarded-Proto, d'où le `trust proxy` du
    // serveur : Caddy termine le TLS, le backend ne voit que du clair.
    secure: req.secure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: DUREE_SESSION_MS,
    ...(estAdresseIP ? {} : { domain: hote.replace(/^www\./, '') }),
  };
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: { id: string; username: string; role: string };
  error?: string;
}

/**
 * POST /api/backoffice/auth/login
 * Simple username and secret key authentication for backoffice staff
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body with Zod schema
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid username or password format',
        issues: parsed.error.flatten().fieldErrors,
      } as AuthResponse);
      return;
    }

    const { username, pwd } = parsed.data;

    // Find user
    const user = await prisma.backofficeUser.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials or account disabled',
      } as AuthResponse);
      return;
    }

    // Verify pwd
    const isValid = await bcrypt.compare(pwd, user.hash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      } as AuthResponse);
      return;
    }

    // Update last login
    await prisma.backofficeUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET_VALUE,
      { expiresIn: JWT_EXPIRY }
    );

    // Le cookie est posé ici, et non par `document.cookie` côté navigateur :
    // écrit en JavaScript, il était forcément lisible en JavaScript, donc une
    // faille XSS quelque part dans l'application suffisait à emporter la
    // session. HttpOnly le rend invisible aux scripts de la page.
    //
    // L'attribut Domain reste nécessaire pour qu'il accompagne les requêtes
    // vers alo, sur son sous-domaine. C'est ce qui interdit le préfixe
    // `__Host-`, que la spécification réserve aux cookies sans Domain :
    // partage entre sous-domaines et durcissement maximal s'excluent.
    res.cookie('backoffice_token', token, cookieSession(req));

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    } as AuthResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    } as AuthResponse);
  }
});

/**
 * GET /api/backoffice/auth/verify
 *
 * Point de contrôle interrogé par la directive `forward_auth` de Caddy pour
 * protéger les applications qui n'ont pas d'authentification propre — alo en
 * premier lieu. Caddy rejoue la requête entrante ici : le jeton arrive donc par
 * cookie, pas par en-tête Authorization, d'où la lecture des deux sources.
 *
 * La réponse ne porte volontairement aucune donnée : Caddy ne regarde que le
 * code, et renvoyer le contenu du jeton l'exposerait à toute application placée
 * derrière ce contrôle.
 */
router.get('/verify', (req: Request, res: Response): void => {
  const token =
    req.headers.authorization?.replace('Bearer ', '') || req.cookies?.backoffice_token;

  if (!token) {
    res.status(401).end();
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET_VALUE);
    res.status(200).end();
  } catch {
    res.status(401).end();
  }
});

/**
 * POST /api/backoffice/auth/verify
 * Verify if JWT token is valid
 */
router.post('/verify', (req: Request, res: Response): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ valid: false });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET_VALUE);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

/**
 * POST /api/backoffice/auth/logout
 * Logout (clear token cookie on backend)
 */
router.post('/logout', (req: Request, res: Response): void => {
  // Les options doivent correspondre exactement à celles de la pose, Domain
  // compris : sinon le navigateur conserve le cookie et la déconnexion ne
  // déconnecte rien. La variante sans domaine efface en plus les sessions
  // ouvertes avant que le cookie ne devienne un cookie de domaine.
  const { maxAge, ...options } = cookieSession(req);
  void maxAge; // exclu volontairement : clearCookie n'en a pas besoin
  res.clearCookie('backoffice_token', options);
  res.clearCookie('backoffice_token', { path: '/' });

  res.json({ success: true });
});

export default router;
