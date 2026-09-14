/**
 * Auth middleware for MongoDB-backed routes.
 * Verifies JWT, hydrates req.user with the Mongoose User document.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models';
import { logger } from '../utils/logger';
import { isJtiDenylisted } from '../utils/tokenDenylist';

// Pin the signing algorithm to prevent algorithm-confusion attacks
// (e.g. forged tokens claiming "alg":"none" or an asymmetric algorithm).
const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

/**
 * Shared permission hierarchy: super_admin inherits every permission that admin has.
 * Use these constants in requireRole() and authorize() calls so the hierarchy
 * is defined in one place and never needs to be duplicated per-route.
 */
export const ADMIN_ROLES = ['admin', 'super_admin'] as const;
export const STAFF_ROLES = ['admin', 'super_admin', 'employee'] as const;

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
  scope?: string;       // e.g. 'mfa_enroll' — a limited token that is NOT a full session
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
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;

    // A limited MFA-enrollment token is NOT a full session — it may only be used
    // on the MFA enrollment endpoints (which accept it explicitly). Reject it
    // everywhere else so it can never bypass MFA to reach protected routes.
    if (payload.scope) {
      res.status(401).json({ error: 'insufficient_scope', message: 'This token cannot access protected routes.' });
      return;
    }

    // Session revocation: a logged-out / rotated jti is rejected immediately.
    if (await isJtiDenylisted(payload.jti)) {
      res.status(401).json({ error: 'token_revoked' });
      return;
    }

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
  const jti = crypto.randomUUID();
  const payload = {
    sub: (user._id as any).toString(),
    org: user.org_id?.toString(),
    role: user.role,
    jti,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '30m', algorithm: JWT_ALGORITHM });
  const refreshToken = jwt.sign({ sub: payload.sub, jti }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d', algorithm: JWT_ALGORITHM });
  return { accessToken, refreshToken };
}

/**
 * Issue a short-lived, limited-scope token that ONLY the MFA enrollment endpoints
 * accept. Lets a privileged user who is required to have MFA but hasn't enrolled
 * complete enrollment — without granting a full session and without bypassing MFA
 * (authenticate() rejects any scoped token above).
 */
export function issueEnrollToken(user: IUser): string {
  return jwt.sign(
    { sub: (user._id as any).toString(), role: user.role, scope: 'mfa_enroll', jti: crypto.randomUUID() },
    process.env.JWT_SECRET!,
    { expiresIn: '15m', algorithm: JWT_ALGORITHM },
  );
}

/** Verify a token that is specifically the MFA-enrollment scope. */
export function verifyEnrollToken(token: string): { sub: string; role: string } {
  const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
  if (payload.scope !== 'mfa_enroll') throw new Error('not_an_enroll_token');
  return { sub: payload.sub, role: payload.role };
}
