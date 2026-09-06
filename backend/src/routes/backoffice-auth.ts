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

type LoginRequest = z.infer<typeof LoginSchema>;

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
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('backoffice_token', { path: '/' });
  res.json({ success: true });
});

export default router;
