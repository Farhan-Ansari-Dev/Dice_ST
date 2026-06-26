/**
 * Auth middleware for MongoDB-backed routes.
 * Verifies JWT, hydrates req.user with the Mongoose User document.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: IUser;
  token_payload?: JwtPayload;
}

interface JwtPayload {
  sub: string;          // user id
  org?: string;         // org id
  role: string;
  iat: number;
  exp: number;
  jti: string;          // unique token id (for revocation)
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthenticated', message: 'Missing Bearer token' });
    return;
  }
  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: 'invalid_token', message: 'User not found' });
      return;
    }
    req.user = user;
    req.token_payload = payload;
    // Ensure org_id is populated from token if missing on user document
    if (!req.user.org_id && payload.org) {
      req.user.org_id = payload.org as any;
    }

    // Track last activity (fire-and-forget)
    User.updateOne(
      { _id: user._id },
      { $set: { last_active_at: new Date() } }
    ).catch(() => {});

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'token_expired' });
    } else {
      logger.warn('[auth] invalid token', err.message);
      res.status(401).json({ error: 'invalid_token' });
    }
  }
}

/**
 * Authorisation guard — restrict route to specific roles.
 *
 *   router.delete('/users/:id', authenticate, requireRole('super_admin', 'admin'), handler);
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', required: roles });
      return;
    }
    next();
  };
}

/**
 * Issue a JWT pair (access + refresh).
 */
export function issueTokens(user: IUser): { accessToken: string; refreshToken: string } {
  const jti = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const payload = {
    sub: (user._id as any).toString(),
    org: user.org_id?.toString(),
    role: user.role,
    jti,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '30m' });
  const refreshToken = jwt.sign({ sub: payload.sub, jti }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}
