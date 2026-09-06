import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const JWT_SECRET_VALUE = JWT_SECRET || 'development-key-insecure';

interface AuthenticatedRequest extends Request {
  user?: jwt.JwtPayload;
}

export const verifyBackofficeToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.backoffice_token;

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE);
    req.user = decoded as jwt.JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
