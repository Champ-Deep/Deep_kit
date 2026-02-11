import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'deepkit-task-tracker-secret-change-in-production';

export interface JWTPayload {
  id: number;
  username: string;
  email: string;
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: JWTPayload): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: '7d', // Token valid for 7 days
    }
  );
}

/**
 * Verify JWT token and extract payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware - Protects routes requiring login
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization header provided',
      });
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Use format: Authorization: Bearer <token>',
      });
    }

    const token = parts[1];

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired',
      });
    }

    // Attach user to request
    req.user = payload;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Optional authentication - Adds user if token present, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = verifyToken(token);
        if (payload) {
          req.user = payload;
        }
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}
