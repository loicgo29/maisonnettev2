import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// JWT_SECRET must be set in environment variables for production
// For dev: set JWT_SECRET in .env file
const JWT_SECRET = process.env.JWT_SECRET || 'development-key-insecure';
const JWT_EXPIRY = '24h';

interface LoginRequest {
  username: string;
  pwd: string;
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
    const { username, pwd } = req.body as LoginRequest;

    if (!username || !pwd) {
      res.status(400).json({
        success: false,
        error: 'Username and secret required',
      } as AuthResponse);
      return;
    }

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
      JWT_SECRET,
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

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

/**
 * POST /api/backoffice/auth/logout
 * Logout (token invalidation on frontend)
 */
router.post('/logout', (_req: Request, res: Response): void => {
  // Token invalidation happens on frontend by clearing localStorage
  res.json({ success: true });
});

export default router;
